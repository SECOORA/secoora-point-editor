if (typeof module !== 'undefined') {
    module.exports = function(d3) {
        return metatable;
    };
}

function metatable(options) {
    var event = d3.dispatch('change', 'rowfocus', 'renameprompt', 'deleteprompt', 'preventprompt', 'newrow');
    var _renamePrompt, _deletePrompt;

    options = options || {};

    var config = {
        newCol: options.newCol !== false,
        renameCol: options.renameCol !== false,
        deleteCol: options.deleteCol !== false,

        newRow: options.newRow !== false
    };

    function coerceNum(x) {
        var fl = parseFloat(x);
        if (fl.toString() === x) return fl;
        else return x;
    }

    function table(selection) {
        selection.each(function(d) {
            var sel = d3.select(this),
                table;

            var keyset = d3.set();
            d.map(Object.keys).forEach(function(k) {
                k.forEach(function(_) {
                    keyset.add(_);
                });
            });

            bootstrap();
            paint();

            event.preventprompt = function(which) {
                switch(which) {
                    case 'rename':
                        _renamePrompt = true;
                    break;
                    case 'delete':
                        _deletePrompt = true;
                    break;
                }
            };

            function bootstrap() {

                var controls = sel.selectAll('.controls')
                    .data([d])
                    .enter()
                    .append('div');

                if (config.newCol) {
                    var colbutton = controls.append('a')
                        .text('New column')
                        .attr('href', '#')
                        .attr('class', 'button icon plus')
                        .on('click', function() {
                            d3.event.preventDefault();
                            var name = prompt('column name');
                            if (name) {
                                keyset.add(name);
                                paint();
                            }
                        });
                }

                var enter = sel.selectAll('table').data([d]).enter().append('table');
                var thead = enter.append('thead');
                var tbody = enter.append('tbody');
                var tr = thead.append('tr');

                table = sel.select('table');

                if (config.newRow) {
                  var tfoot = enter.append('tfoot'),
                    foottr = tfoot.append('tr'),
                    keys = keyset.values();

                  var foottd = foottr.selectAll('td').data(keys, function(d) { return d; });

                  foottd.enter()
                    .append('td')
                    .append('textarea')
                    .attr('field', String)
                    .on('keyup', function() {

                      // grab current data, append new row with stuff from this tfoot row, run paint(), set focus to new row, clear tfoot row
                      var ta = foottr.selectAll('td textarea'),
                        selIdx = _.values(ta._groups[0]).indexOf(this),
                        vals = _.map(ta._groups[0], function(v) { return coerceNum(d3.select(v).property('value')); }),
                        newRow = _.zipObject(keyset.values(), vals);

                      d.push(newRow);
                      sel.selectAll('table').data([d]);

                      paint();

                      // clear tfoot textareas
                      ta.property('value', '');

                      // set focus to the field we just added
                      this.parentNode.parentNode.parentNode.previousSibling.lastChild.childNodes[selIdx].childNodes[0].focus();

                      // trigger a new row event
                      event.call("newrow", this, newRow, d.length - 1);
                    });
                }
            }

            function paint() {

                var keys = keyset.values();

                var th = table
                    .select('thead')
                    .select('tr')
                    .selectAll('th')
                    .data(keys, function(d) { return d; });

                var thEnter = th.enter()
                    .append('th')
                    .text(String);

                var actionLinks = thEnter
                    .append('div')
                    .attr('class', 'small');

                if (config.deleteCol) {
                    var delbutton = actionLinks
                        .append('a')
                        .attr('href', '#')
                        .attr('class', 'icon trash')
                        .text('Delete')
                        .on('click', deleteClick);
                }

                if (config.renameCol) {
                    var renamebutton = actionLinks
                        .append('a')
                        .attr('href', '#')
                        .attr('class', 'icon pencil')
                        .text('Rename')
                        .on('click', renameClick);
                }

                th.exit().remove();

                var tr = table.select('tbody').selectAll('tr')
                    .data(function(d) { return d; });

                var trenter = tr.enter().append('tr');
                tr.exit().remove();

                var td = trenter.merge(tr).selectAll('td')
                    .data(keys, function(d) { return d; });

                td.enter()
                    .append('td')
                    .append('textarea')
                    .attr('field', String);

                td.exit().remove();

                function deleteClick(d) {
                    d3.event.preventDefault();
                    var name = d;
                    //event.deleteprompt(d, completeDelete);
                    event.call("deleteprompt", this, d, completeDelete);

                    if (_deletePrompt || confirm('Delete column ' + name + '?')) {
                        completeDelete(d);
                    }
                }

                function completeDelete(name) {
                    keyset.remove(name);
                    tr.selectAll('textarea')
                        .data(function(d, i) {
                            var map = d3.map(d);
                            map.remove(name);
                            var reduced = mapToObject(map);
                            //event.change(reduced, i);
                            event.call("change", this, reduced, i);

                            return {
                                data: reduced,
                                index: i
                            };
                        });
                    paint();
                }

                function renameClick(d) {
                    d3.event.preventDefault();
                    var name = d;
                    //event.renameprompt(d, completeRename);
                    event.call("renameprompt", this, d, completeRename);

                    var newname = (_renamePrompt) ?
                        undefined :
                        prompt('New name for column ' + name + '?');

                    if (_renamePrompt || newname) {
                        completeRename(newname, name);
                    }
                }

                function completeRename(value, name) {
                    keyset.add(value);
                    keyset.remove(name);
                    tr.selectAll('textarea')
                        .data(function(d, i) {
                            var map = d3.map(d);
                            map.set(value, map.get(name));
                            map.remove(name);
                            var reduced = mapToObject(map);
                            //event.change(reduced, i);
                            event.call("change", this, reduced, i);
                            return {
                                data: reduced,
                                index: i
                            };
                        });
                    paint();
                }

                function write(d) {
                    d.data[d3.select(this).attr('field')] = coerceNum(this.value);
                    //event.change(d.data, d.index);
                    event.call("change", this, d.data, d.index);
                }

                function mapToObject(map) {
                    return map.entries()
                        .reduce(function(memo, d) {
                            memo[d.key] = d.value;
                            return memo;
                        }, {});
                }

                trenter.merge(tr).selectAll('textarea')
                    .data(function(d, i) {
                        return d3.range(keys.length).map(function() {
                            return {
                                data: d,
                                index: i
                            };
                        });
                    })
                    .classed('disabled', function(d) {
                        return d.data[d3.select(this).attr('field')] === undefined;
                    })
                    .property('value', function(d) {
                        var value = d.data[d3.select(this).attr('field')];
                        return !isNaN(value) ? value : value || '';
                    })
                    .on('keyup', write)
                    .on('change', write)
                    .on('click', function(d) {
                        if (d.data[d3.select(this).attr('field')] === undefined) {
                            d.data[d3.select(this).attr('field')] = '';
                            paint();
                        }
                    })
                    .on('focus', function(d) {
                        //event.rowfocus(d.data, d.index);
                        event.call("rowfocus", this, d.data, d.index);
                    });
            }
        });
    }

    table.on = function() {
      var value = event.on.apply(event, arguments);
      return value === event ? table : value;
    }

    return table;
}
