// storage engine
localforage.config({
    driver: localforage.LOCALSTORAGE,
    name: 'secooraPointEntry',
    storeName: 'secoora_point_entry'
});

// @TODO: default layers get loaded/stored in localforage if no key already in localforage

var colorScale = d3.scaleOrdinal(d3.schemeDark2),
  userColorScale = d3.scaleOrdinal(d3.schemeSet1);

// default layers
var defaultLayers = [
  {name: 'Bathymetry', url: "se_bathy.geojson", visible: true},
  {name: 'HF Radar', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/hfradar/hfradar.geojson", visible: true},
  {name: 'Glider Tracks', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/glider_tracks/gliders_from_georefd.geojson", visible: true},
  {name: 'Glider Tracks (triangle)', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/glider_tracks/georef_glider_triangles.geojson", visible: true},
  //{name: 'Gliders', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/gliders/gliders.geojson", visible: true},
  {name: 'Regional Stations', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/stations/regional/stations.geojson", visible: true},
  {name: 'SECOORA Funded', url: "https://raw.githubusercontent.com/SECOORA/static_assets/master/stations/assets/stations.geojson", visible: false}
]

// leaflet
var map = L.map('mapid').setView([30.676, -80.134], 6);
//var layer = new L.StamenTileLayer("terrain-background");
//var attribution = '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';
//var layer = L.tileLayer('http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', {attribution: attribution})
var layer = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{ attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>' });
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
            radius: 3,
            fillColor: colorScale(i),
            color: colorScale(i),
            weight: 1,
            opacity: 1,
            fillOpacity: 0.5
          });
        },
        style: {
          color: colorScale(i),
          weight: 1,
          opacity: 0.5,
        },
        onEachFeature: function(feature, layer) {
          setPopup(feature.properties, layer);
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
    .attr('class', 'list-group-item')
    .on('click', function(d) {
      d3.select(this).classed('disabled', d.visible);

      if (d.visible) {
        map.removeLayer(d.layer);
        d.visible = false;
        reorderLayers();
      } else {
        map.addLayer(d.layer);
        d.visible = true;
        reorderLayers();
      }
    });

  cards.append('div')
    .attr('class', 'tag tag-default tag-pill float-xs-right layercard__swatch')
    .style('background-color', function(d) { return d.color })
    .html("&nbsp;");

  cards.append('div')
    .attr('class', 'layercard__text')
    .text(function(d) { return d.name });

  reorderLayers();
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
      color = userColorScale(i);

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
              weight: 1,
              opacity: 1,
              fillOpacity: 1
            });
          },
          style: {
              color: color
          },
          onEachFeature: function(feature, layer) {
            setPopup(feature.properties, layer);
          }
        });
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
          //console.log("LOADING", d.data);
          return _.map(d.data, function(dd, ii) {
            return _.assign({_idx: ii}, dd);
          });
        },
        insertItem: function(item) {
          //console.log("INSERT", item);
          
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
          //console.log("UPDATE", item);

          var idx = item._idx,
            newItem = _.omit(item, ['_idx']);

          d.data[idx] = newItem;

          // store in localstorage
          return save(d).then(function() {
            return item;
          });
        },
        deleteItem: function(item) {
          //console.log("DELETE", item);

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
        },
        editTemplate: function(value) {
          var template = jsGrid.NumberField.prototype.editTemplate.call(this, value);
          template.on('keydown', null, this._grid, function(e) {
            if (e.which === 13) {
              e.data.updateItem();
            } else if (e.keyCode === 27) {
              e.data.cancelEdit();
            }
          });
          return template;
        },
        insertTemplate: function(value) {
          var template = jsGrid.NumberField.prototype.insertTemplate.call(this, value);
          template.on('keydown', null, this._grid, function(e) {
            var grid = e.data;
            if (e.which === 13) {
              grid.insertItem().done(function() {
                grid.clearInsert(); 
              });
            } else if (e.keyCode === 27) {
              $('.' + jsGrid.ControlField.prototype.insertModeButtonClass).click();
            }
          });
          return template;
        }
      });

      jsGrid.fields.decimal = DecimalField;

      function genEnterEditor(value) {
        var template = jsGrid.TextField.prototype.editTemplate.call(this, value);
        template.on('keydown', null, this._grid, function(e) {
          if (e.which === 13) {
            e.data.updateItem();
          } else if (e.keyCode === 27) {
            e.data.cancelEdit();
          }
        });
        return template;
      }

      function genInsertTemplate(value) {
        var template = jsGrid.TextField.prototype.insertTemplate.call(this, value);
        template.on('keydown', null, this._grid, function(e) {
          var grid = e.data;
          if (e.which === 13) {
            grid.insertItem().done(function() {
              grid.clearInsert(); 
            });
          } else if (e.keyCode === 27) {
            $('.' + jsGrid.ControlField.prototype.insertModeButtonClass).click();
          }
        });
        return template;
      }

      // default schema
      var defaultSchema = [
        { name: "name", type: "text", editTemplate: genEnterEditor, insertTemplate: genInsertTemplate},
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
          type: "text",
          editTemplate: genEnterEditor,
          insertTemplate: genInsertTemplate
        }
      }));

      schema.push({type: "control"});

      $('.editor__grid').jsGrid({
        width: "100%",
        height: "200px",

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

          setPopup(_.omit(item, ['lat', 'lon', '_idx']), marker);
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
          setPopup(_.omit(item, ['lat', 'lon', '_idx']), marker);
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
        reorderLayers();
      } else {
        map.addLayer(d.layer);
        d.visible = true;
        reorderLayers();
      }
    });

  cards.append('div')
    .attr('class', 'layercard__text')
    .text(function(d) { return d.name });

  reorderLayers();
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

// attempt to parse value and determine format
// returns an object
// {
//   type: 'geojson' | 'csv' | 'unknown',
//   error: ...  // only set if there was an issue.  type will be set to what we thought it might be
//   data: ...
// }
function tryParse(val) {
    var err = null;

    // first, try parsing it as JSON as that's more strict.

    try {
      var gjo = JSON.parse(val);

      return {
        type: 'geojson',
        data: gjo
      }

    } catch (e) {
      // should we bother parsing with CSV?
      if (val.trim().startsWith("{")) {
        return {
          type: 'geojson',
          error: e,
          data: null
        }
      }
    }

    var csvParsed = Papa.parse(val, {
      header: true,
      dynamicTyping: true
    });

    // how to validate csv?

    return {
      type: 'csv',
      data: csvParsed
    }

    // TODO
    return {
      type: 'unknown',
      error: 'Could not determine format of contents',
      data: null
    }
}

function findSimilar(fields, name) {
  var weights = _.map(fields, function(d) {
    return {
      name: d,
      weight: jaro_winkler.distance(name, d)
    };
  });

  // 0.6 arbitrarily chosen!
  var filtered = _.reject(_.sortBy(weights, 'weight').reverse(), function(o) { return o.weight < 0.6 });
  if (filtered.length == 0) {
    return null;
  }

  return filtered[0].name;
}

function parseHint() {
  var val = $('#new-modal__contents').val(),
    parsedData = tryParse(val);

  setHint(parsedData.type);
}

// set the csv/geojson hint label
// can pass null to clear it
function setHint(type) {
  $('#new-modal .btn-group label').removeClass('active btn-success');
  if (type !== null) {
    $('#format-' + type).parent().addClass('active btn-success');
  }
}

$('#new-modal__contents').on('change keyup paste', _.debounce(parseHint, 500));
$('#new-modal__name').one('keyup paste', function() {
  $(this).data('edited', 'true');
});

$('#new-modal__file').on('change', function() {
  var file = $(this).get(0).files[0],
    name = $('#new-modal__name').val();

  // set hint if we can figure it out
  if (file.name.toLowerCase().endsWith(".csv")) {
    setHint('csv');
  } else if (file.name.toLowerCase().endsWith('json')) {
    setHint('geojson');
  } else {
    setHint(null);
  }
  
  // set name if never been set
  if ($('#new-modal__name').data('edited') !== 'true') {
    var dotIndex = file.name.lastIndexOf('.');

    if (dotIndex != -1) {
      var newName = file.name.slice(0, dotIndex),
        finalName = findAvailableLayerName(newName);

      $('#new-modal__name').val(finalName);
    }
  }
});

$('.new-modal__import').click(function() {

  // kill any previous dangers/alerts
  $('#new-modal').find('.form-control-feedback').remove();
  $('#new-modal').find('.has-danger').removeClass('has-danger');
  $('#new-modal').find('.form-control-danger').removeClass('form-control-danger');

  var contents = $('#new-modal__contents').val(),
    file = $('#new-modal__file').get(0).files[0],
    parsedData = null;
  
  // if the contents pane visible, parse and immediatly call doImport
  if ($('#tab-paste').hasClass('active')) {
    if (contents.trim().length == 0) {
      contents = {};
    }

    parsedData = tryParse(contents);
    doImport(parsedData);
  } else if ($('#tab-file').hasClass('active')) {

    if (file === undefined) {

      $('#new-modal__file').parent().addClass('has-danger')
        .append('<div class="form-control-feedback">File is required</div>');

      return;
    }

    if (file.name.toLowerCase().endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: function(pd, oldF) {
          doImport({
           type: 'csv',
           data: pd
          }); 
        }
      });
      
    } else if (file.name.toLowerCase().endsWith('json')) {

      var reader = new FileReader();
      reader.onload = function(event) {
        parsedData = tryParse(event.target.result);
        if (parsedData.type == 'geojson') {
          doImport(parsedData);
        } else {
          $('#new-modal__file').parent().addClass('has-danger')
            .append('<div class="form-control-feedback">Expected geojson format</div>');

          return;
        }
      };

      reader.readAsText(file);
    } else {
      $('#new-modal__file').parent().addClass('has-danger')
        .append('<div class="form-control-feedback">File must end in json or .csv!</div>');

    }
  }
});

function doImport(parsedData) {
  var invalid = false,
    name = $('#new-modal__name').val(),
    layerData = null;

  // if user didn't enter a name, it's an error
  if (!name) {
    $('#new-modal__name').parent().addClass('has-danger')
      .append('<div class="form-control-feedback">Name is required</div>');

    $('#new-modal__name').addClass('form-control-danger');
    invalid = true;
  }  

  if (parsedData.hasOwnProperty('error')) {
    $('#new-modal__contents').parent().addClass('has-danger')
      .append('<div class="form-control-feedback">' + 'Could not parse: ' + parsedData.error + '</div>');

    $('#new-modal__contents').addClass('form-control-danger');
    invalid = true;
  }

  if (invalid) return;

  if (parsedData.type == 'geojson') {
    layerData = _.map(parsedData.data.features, function(d, i) {
      return _.assign({
        name: d.properties.name || "Item " + (i+1),
        lat: d.geometry.coordinates[1],
        lon: d.geometry.coordinates[0]
      }, d.properties);
    })
  } else if (parsedData.type == 'csv') {
    // find lat/lon
    var latName = findSimilar(parsedData.data.meta.fields, 'lat'),
      lonName = findSimilar(parsedData.data.meta.fields, 'lon');

    console.debug("Lat field:", latName, "Lon field:", lonName);

    if (latName === null || lonName === null) {
      $('#new-modal').one('hidden.bs.modal', function(e) {
        window.alert("Could not find lat (" + latName + ") or lon (" + lonName + "), blank values used.");
      });

    }

    // transform data
    layerData = _.map(parsedData.data.data, function(d, i) {
      return _.assign({
        name: d.name || "Item " + (i+1),
        lat: d[latName] || 0.0,
        lon: d[lonName] || 0.0
      }, _.omit(d, [latName, lonName]));
    });
  }

  var layer = {
    name: name,
    visible: true,
    data: layerData
  };

  // save to localforage
  save(layer).then(function() {
    // reupdate UI
    loadUserLayers(window.userLayers);
  });

  closeEditorPane();
  $('#new-modal').modal('hide');
}

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

function findAvailableLayerName(prefix) {
  var curNames = _.map(window.userLayers, 'name'),
    name = '';

  // start with prefix itself
  if (curNames.indexOf(prefix) == -1) {
    return prefix;
  }

  for (var i = 2; i < 500; i++) {
    name = prefix + " " + i;
    if (curNames.indexOf(name) == -1)
      break;
  }

  return name;
}

$('#new-modal').on('show.bs.modal', function(e) {
  var name = findAvailableLayerName("Unnamed Layer");
  if (!name) {
    throw "500 names?!?";
  }

  $('#new-modal__name').val(name);

  setHint(null);
});

$('#new-modal').on('shown.bs.modal', function(e) {
  $('#new-modal__name').select().focus();
});

$('#new-modal__contents').focus(function() {
  $(this).select();
});

$('.export-modal__geojson').focus(function() {
  $(this).select();
});

$('#new-modal, #export-modal').on('hidden.bs.modal', function(e) {
  var form = $(this).find('form');
  form[0].reset();

  // kill any dangers/alerts
  $('#new-modal').find('.form-control-feedback').remove();
  $('#new-modal').find('.has-danger').removeClass('has-danger');
  $('#new-modal').find('.form-control-danger').removeClass('form-control-danger');
});

function reorderLayers() {
  // reverse go through layers in predefined, send them to back
  var predefined = d3.select('.layerbar__predefined .list-group').selectAll('li').data();
  predefined.reverse();

  predefined.forEach(function(d) {
    if (d.visible) {
      d.layer.bringToBack();
    }
  });

  // go through layers in userlayers, send them to front (in order)
  window.userLayers.forEach(function(d) {
    if (d.visible) {
      d.layer.bringToFront();
    }
  });
}

function setPopup(properties, layer) {
  var desc = "";
  for (var key in properties) {
    desc = desc + "<tr><td>" + key + "</td><td>" + properties[key] + "</td></tr>\n";
  }
  if (layer) {
    layer.bindPopup("<table class='map-popup-table'>" + desc + "</table>");
  }

  return desc;
}

