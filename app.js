// storage engine
localforage.config({
    driver: localforage.LOCALSTORAGE,
    name: 'secooraPointEntry',
    storeName: 'secoora_point_entry'
});

// @TODO: default layers get loaded/stored in localforage if no key already in localforage

var colorScale = d3.scaleOrdinal(d3.schemeCategory20);

// default layers
var defaultLayers = [
  {name: 'bathygeon', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/bathy/bathy.geojson", visible: true},
  {name: 'hfradar', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/hfradar/hfradar.geojson", visible: true},
  {name: 'gliders_from_georefd', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/glider_tracks/gliders_from_georefd.geojson", visible: true},
  {name: 'georef_glider_triangles', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/glider_tracks/georef_glider_triangles.geojson", visible: true},
  {name: 'gliders', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/gliders/gliders.geojson", visible: true},
  {name: 'stations', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/stations/stations.geojson", visible: true}
]

// leaflet
var map = L.map('mapid').setView([30.676, -80.134], 6);
var layer = new L.StamenTileLayer("terrain-background");
//var attribution = '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';
//var layer = L.tileLayer('http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', {attribution: attribution})
map.addLayer(layer);

// add default layers
var q = d3.queue();
defaultLayers.forEach(function(e) {
  q.defer(d3.json, e.url);
});

q.awaitAll(function(error, data) {
  //console.log(data);

  // zip back up with original data
  var newData = _.map(defaultLayers, function(d, i) {
    return _.assign(_.clone(d), {
      color: colorScale(i),
      layer: L.geoJson(data[i], {
        pointToLayer: function(feature, latlng) {
          return L.circleMarker(latlng, {
            radius: 5,
            fillColor: colorScale(i),
            color: colorScale(i),
            weight: 1,
            opacity: 1,
            fillOpacity: 1
          });
        },
        style: {
          color: colorScale(i),
          weight: 2
        }              
    })});
  });

  newData.forEach(function(e) {
    e.layer.addTo(map);
  });

  // add to left hand controls
  var cards = d3.select('.layerbar__predefined .list-group')
    .selectAll('li')
    .data(newData)
    .enter()
    .append('li')
    .attr('class', 'list-group-item');

  cards.append('div')
    .attr('class', 'tag tag-default tag-pill float-xs-right layercard__swatch')
    .style('background-color', function(d) { return d.color })
    .html("&nbsp;")
    .on('click', function(d) {
      d3.select(this.parentNode).classed('disabled', d.visible);

      if (d.visible) {
        map.removeLayer(d.layer);
        d.visible = false;
      } else {
        map.addLayer(d.layer);
        d.visible = true;
      }
    });

  cards.append('div')
    .attr('class', 'layercard__text')
    .text(function(d) { return d.name });
});

function dataToGeoJson(data) {
    var features = _.map(data, function(d) {
      var props = _.omit(d, ['lon', 'lat']);
      return {
          type: "Feature",
          properties: props,
          geometry: {
              type: "Point",
              coordinates: [
                  d.lon,
                  d.lat
              ]
          }
      }
    });
    return {
        type: "FeatureCollection",
        features: features
    }
}

function save(dataItem) {
  // set in userLayers
  if (dataItem.index === undefined) {
    dataItem.index = window.userLayers.length;
  }
  window.userLayers[dataItem.index] = dataItem;
  return _save();
}

/**
  * Saves whatever is currently in userLayers
  */
function _save() {
  // strip presentation attributes from userLayers
  var saveValue = _.map(window.userLayers, function(d) {
    return _.omit(d, ['layer', 'color', 'index']);
  });

  // store in localstorage
  return localforage.setItem('user-layers', saveValue);
}

function loadUserLayers(value) {
  window.userLayers = _.map(value, function(d, i) {
    var gj = dataToGeoJson(d.data),
      color = colorScale(defaultLayers.length + i);

    // always assign color/visible/index, index will change!
    _.assign(d, {
        color: color,
        visible: d.visible !== false,
        index: i,
    });

    // only create/assign layer if we don't already have one
    if (d.layer === undefined) {
        d.layer = L.geoJson(gj, {
            pointToLayer: function(feature, latlng) {
              return L.circleMarker(latlng, {
                radius: 5,
                fillColor: color,
                color: color,
                weight: 1,
                opacity: 1,
                fillOpacity: 1
              });
            },
            style: {
                color: color
            }});
    }

    return d;
  });

  // add to left hand controls
  var selCards = d3.select('.layerbar__user__layers')
    .selectAll('li')
    .data(window.userLayers, function(d) {
         return d.name;
    });

  // delete if necessary
  selCards.exit()
    .remove();

  // remove map layers on anything in exit selection
  // @TODO: peeks too much into internals
  selCards.exit()._groups[0].forEach(function(e) {
      map.removeLayer(e.__data__.layer);
  });

  var cards = selCards.enter()
    .append('li')
    .attr('class', 'list-group-item')
    .on('click', function(d) { 
      d3.selectAll('.layerbar__user__layers .list-group-item-info').classed('list-group-item-info', false);
      d3.select(this).classed('list-group-item-info', true);

      // enable buttons
      $('.editor__toolbar button').attr('disabled', false);

      // add handler for export
      $('.editor__toolbar__export').off('click');
      $('.editor__toolbar__export').click(function() {
        var gj = dataToGeoJson(d.data),
          gjs = JSON.stringify(gj, null, '  ');

        $('.export-modal__geojson').val(gjs);
        $('.export-modal__link').attr('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(gjs));
        $('.export-modal__link').attr('download', d.name + ".geojson");
        $('#export-modal').modal();
      });

      // sizeup editor pane
      $('.editor').css('flex-basis', '40%');

      // add handler for delete
      $('.editor__toolbar__delete').off('click');
      $('.editor__toolbar__delete').click(function() {
        if (window.confirm("Do you really want to delete layer " + d.name + "?")) {
          // remove from userLayers, store in localforage
          window.userLayers.splice(d.index, 1);
          _save();    // we're not updating or adding so just use internal save current

          // run through updateLayers
          loadUserLayers(window.userLayers);

          // close editor
          closeEditorPane();
        }
      });

      // define data controller for editor view
      // interfaces with localforage
      var controller = {
        loadData: function(filter) {
          console.log("LOADING", d.data);
          return _.map(d.data, function(dd, ii) {
            return _.assign({_idx: ii}, dd);
          });
        },
        insertItem: function(item) {
          console.log("INSERT", item);
          
          // append new item to d
          var newIdx = d.data.length;
          d.data[newIdx] = _.clone(item);

          // store in localstorage
          return save(d).then(function() {
            item._idx = newIdx;
            return item;
          });
        },
        updateItem: function(item) {
          console.log("UPDATE", item);

          var idx = item._idx,
            newItem = _.omit(item, ['_idx']);

          d.data[idx] = newItem;

          // store in localstorage
          return save(d).then(function() {
            return item;
          });
        },
        deleteItem: function(item) {
          console.log("DELETE", item);

          var idx = item._idx;
          d.data.splice(idx, 1);

          // store in localstorage
          return save(d);
        }
      };

      // extend jsgrid with decimal type
      var DecimalField = function(config) {
        jsGrid.Field.call(this, config);
      };

      DecimalField.prototype = new jsGrid.NumberField({
        filterValue: function() { 
          return parseFloat(this.filterControl.val());
        },
        insertValue: function() {
          return parseFloat(this.insertControl.val());
        },
        editValue: function() {
          return parseFloat(this.editControl.val());
        }
      });

      jsGrid.fields.decimal = DecimalField;

      // default schema
      var defaultSchema = [
        { name: "name", type: "text" },
        { name: "lat", type: "decimal" },
        { name: "lon", type: "decimal" },
      ]

      // grab any additional fields
      var schema = defaultSchema.concat(_.map(_.filter(_.uniq(_.flatten(_.map(d.data, function(dd) {
        return _.keys(dd);
      }))), function(dd) {
        return _.map(defaultSchema, 'name').indexOf(dd) == -1;
      }), function(dd) {
        return {
          name: dd,
          type: "text"
        }
      }));

      schema.push({type: "control"});

      $('.editor__grid').jsGrid({
        width: "100%",

        inserting: true,
        editing: true,
        sorting: false,
        paging: false,

        autoload: true,
        fields: schema,
        controller: controller,

        onItemInserted: function(args) {
          // new layer for new item
          var item = args.item,
            lat = parseFloat(item.lat) || 0,
            lon = parseFloat(item.lon) || 0,
            latlng = new L.LatLng(lat, lon),
            marker = L.circleMarker(latlng, {
              radius: 5,
              fillColor: d.color,
              color: d.color,
              weight: 1,
              opacity: 1,
              fillOpacity: 1
            });

          marker.bindPopup(item.name);
          d.layer.addLayer(marker);
        },

        onItemUpdated: function(args) {
          // adjust marker
          var item = args.item,
            lat = parseFloat(item.lat) || 0,
            lon = parseFloat(item.lon) || 0,
            latlng = new L.LatLng(lat, lon),
            marker = d.layer.getLayers()[item._idx];

          marker.setLatLng(latlng);
          marker.bindPopup(item.name);
        },

        onItemDeleted: function(args) {
          // remove marker!
          var item = args.item,
            marker = d.layer.getLayers()[item._idx];
          d.layer.removeLayer(marker);
        }
        });
    });

  // add map layers on anything in enter selection
  // @TODO: peeks too much into internals
  cards._groups[0].forEach(function(e) {
      e.__data__.layer.addTo(map);
  });

  cards.append('div')
    .attr('class', 'tag tag-default tag-pill float-xs-right layercard__swatch')
    .style('background-color', function(d) { return d.color })
    .html('&nbsp;')
    .on('click', function(d) {
      d3.event.stopPropagation();
      d3.select(this.parentNode).classed('disabled', d.visible);

      if (d.visible) {
        map.removeLayer(d.layer);
        d.visible = false;
      } else {
        map.addLayer(d.layer);
        d.visible = true;
      }
    });

  cards.append('div')
    .attr('class', 'layercard__text')
    .text(function(d) { return d.name });


}

// LOAD USER DEFINED LAYERS FROM LOCALSTORAGE
localforage.getItem('user-layers')
  .then(function(value) {
    if (value === null) {
      value = [];
    }
    window.userLayers = value;
    return window.userLayers;
  })
  .then(loadUserLayers)
  .catch(function(err) {
    console.error(err)
});

$('.layerbar__user__add').click(function() {
  $('#new-modal').modal();
});

$('.new-modal__import').click(function() {

  // kill any previous dangers/alerts
  $('#new-modal').find('form-control-feedback').remove();
  $('#new-modal').find('.has-danger').removeClass('has-danger');
  $('#new-modal').find('.form-control-danger').removeClass('form-control-danger');

  var invalid = false;

  // transform geojson into our format
  try {
    var gj = $('#new-modal__geojson').val();

    if (!gj) {
      gj = {
        type: "FeatureCollection",
        features: []
      };
    }

    var gjo = JSON.parse(gj);
  } catch (e) {
    $('#new-modal__geojson').parent().addClass('has-danger')
      .append('<div class="form-control-feedback">' + 'Could not parse GeoJSON: ' + e + '</div>');

    $('#new-modal__geojson').addClass('form-control-danger');
    invalid = true;
  }

  name = $('#new-modal__name').val();

  // if user didn't enter one, it's an error
  if (!name) {
    $('#new-modal__name').parent().addClass('has-danger')
      .append('<div class="form-control-feedback">Name is required</div>');

    $('#new-modal__name').addClass('form-control-danger');
    invalid = true;
  }  

  if (invalid) return;

  var layer = {
    name: name,
    visible: true,
    data: _.map(gjo.features, function(d, i) {
      return _.assign({
        name: d.properties.name || "Item " + (i+1),
        lat: d.geometry.coordinates[1],
        lon: d.geometry.coordinates[0]
      }, d.properties);
    })
  };

  // save to localforage
  save(layer).then(function() {
    // reupdate UI
    loadUserLayers(window.userLayers);
  });

  closeEditorPane();
  $('#new-modal').modal('hide');
});

function closeEditorPane() {
  // shrink editor pane
  $('.editor').css('flex-basis', '50px');

  // disable toolbar buttons, remove handlers
  $('.editor__toolbar__export').attr('disabled', true);
  $('.editor__toolbar__delete').attr('disabled', true);
  $('.editor__toolbar__export').off('click');
  $('.editor__toolbar__delete').off('click');

  // remove jsGrid
  if ($('.editor__grid').has('div').length) {
    $('.editor__grid').jsGrid("destroy");
  }

  // remove any editing highlight from user pane list items
  d3.selectAll('.layerbar__user__layers .list-group-item-info').classed('list-group-item-info', false);
}

$('.editor .close').click(closeEditorPane);

$('#new-modal').on('show.bs.modal', function(e) {
  var curNames = _.map(window.userLayers, 'name'),
    name = '';
  for (var i = 1; i < 500; i++) {
    name = "Unnamed Layer " + i;
    if (curNames.indexOf(name) == -1)
      break;
  }

  if (!name) {
    throw "500 names?!?";
  }

  $('#new-modal__name').val(name);
});

$('#new-modal').on('shown.bs.modal', function(e) {
  $('#new-modal__name').select().focus();
});

$('#new-modal__geojson').focus(function() {
  $(this).select();
});

$('.export-modal__geojson').focus(function() {
  $(this).select();
});

$('#new-modal, #export-modal').on('hidden.bs.modal', function(e) {
  var form = $(this).find('form');
  form[0].reset();

  // kill any dangers/alerts
  $('#new-modal').find('form-control-feedback').remove();
  $('#new-modal').find('.has-danger').removeClass('has-danger');
  $('#new-modal').find('.form-control-danger').removeClass('form-control-danger');
});

