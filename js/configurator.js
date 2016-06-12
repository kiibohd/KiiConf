/*
    KII Keyboard Editor
    Copyright (C) 2016 Matteo Spinelli
                  2016 Jeremy Bondeson

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Configurator = (function (DEFAULTS, SETTINGS, Key, ImportMap, window, document) {
    'use strict';

    const lastMapKey = 'configurator-last-loaded-map';
    const prevEditsKey = 'configurator-prev-edits';

    var conf = Object.create(Emitter);
    var ext =  {
        create: () => Object.create(Configurator),
        init: init,
        loadLayout: loadLayout,
        buildLayout: buildLayout,
        selectKey: selectKey,
        keyPressed: keyPressed,
        deselectKeys: deselectKeys,
        shortcut: shortcut,
        layerSelect: layerSelect,
        displayLayers: displayLayers,
        clearLayout: clearLayout,
        downloadMap: downloadMap,
        keymapChanged: keymapChanged,
        setDirty: setDirty,
        serializeKeyboardMap: serializeKeyboardMap,
        revertLayout: revertLayout,
        getUrlParameters: getUrlParameters //TODO: Move to util module
    };

    Object.assign(conf, ext);

    return conf;

    // TODO: Break this up...
    function init() {
        this.header = {};
        this.matrix = [];

        this._selectedLayer = 0;
        this._dirty = false;

        this.$stage = $('#stage');
        this.$document = $(document);

        SETTINGS.STAGE_WIDTH = Math.floor(this.$stage.width() / SETTINGS.GRID_SIZE);
        SETTINGS.STAGE_HEIGHT = Math.floor(this.$stage.height() / SETTINGS.GRID_SIZE);

        // create shortcuts
        var $shortcuts = $('#shortcuts');
        var $shortcutsGroup;
        var group = '';
        $.each(DEFAULTS.keyDefaults, function (k, v) {
            if ('group' in v) {

                if (group != v.group) {
                    $shortcutsGroup = $('#group-' + v.group).length
                        ? $('#group-' + v.group)
                        : $('<ul id="group-' + v.group + '" class="group"><li class="title">' + v.group + '</li></ul>')
                            .appendTo($shortcuts);
                    group = v.group;
                }

                $shortcutsGroup.append('<li><span class="shortcut-button" data-key="' + k.replace('"', '&quot;') + '">' + ( v.label || k ) + '</span></li>');
            }
        });
        $shortcuts.on('click', this.shortcut.bind(this));

        // import button
        $('#import-map').click(() => {
            var im = ImportMap.create();
            im.popup('Import a previously created layout</br>Must be valid json',
                'import map',
                '',
                json => this.buildLayout($.parseJSON(json)));
        });

        // download button
        $('#download-map')
            .on('click', this.downloadMap.bind(this));

        // The following two functions need access to both lexical and
        // prototypal this variants.
        var that = this;

        // tab switch
        $('#layers li').on('click', function (e) {
            //e.stopPropagation();
            that.layerSelect.call(that, this);
        });

        // show/hide layers
        $('#layers input').on('click', function (e) {
            e.stopPropagation();
            that.displayLayers.call(that, this);
        });

        // Revert layout button
        var $revLayout = $("#revert-layout")
            .on('click', this.revertLayout.bind(this));

        this.on('dirty', (_, dirty) => {
            $revLayout.prop('disabled', !dirty);
        });

        // deselect keys
        this.$document
            .on('keydown', this.keyPressed.bind(this))
            .on('click', this.deselectKeys.bind(this));

        this.displayLayers();

        // Load the layers from the server.
        var params = this.getUrlParameters();
        var queryString = '';

        if (params.hasOwnProperty('layout')) {
            queryString = '?layout=' + params['layout'][0];
        } else {
            var lastMap = window.localStorage.getItem(lastMapKey);
            if (lastMap) {
                queryString = '?layout=' + lastMap;
            }
        }

        $.ajax({
            type: 'get',
            url: SETTINGS.URI + 'renderedlayouts.php' + queryString, //TODO: send query params
            success: (response) => {
                $(response)//.fadeIn('slow')
                    .appendTo('#layout-list');

                // drop down layout select
                var $layoutList = $('#layout-list');
                $layoutList.on('click', function (e) {
                    e.stopPropagation();

                    var $el = $(this);
                    $el.toggleClass('show');

                    if ( $el.hasClass('show') ) {
                        that.$document.one('click', function () {
                            $el.removeClass('show');
                        });
                    }
                });

                this.loadLayout( $layoutList.find('.selected').data('layout') );
            },
            error: function (response) {
                alert('Connection error!');
            }
        });
    }

    function loadLayout(file) {
        file = file || $('#layout-list .selected').data('layout');

        if ( ! file ) {
            alert('Error loading layout. Please refresh the page.');
            return;
        }

        var loadOrigOrPrev = layout => {
            this._unmodified = layout;
            var prev = window.localStorage.getItem(prevEditsKey);
            prev = prev ? JSON.parse(prev) : {};
            if (prev[layout.header.Name] && prev[layout.header.Name][layout.header.Layout]) {
                this.buildLayout(prev[layout.header.Name][layout.header.Layout]);
                this.setDirty(true);
                //TODO: Replace with template.
                //TODO: Make a cross-page module.
                var $alert = $('#alert')
                    .removeClass('hide');

                var dismiss = () => {
                    $alert.addClass('hide')
                        .off('click', dismiss);
                };

                $alert.on('click', dismiss);
            } else {
                this.buildLayout(layout)
            }
        };

        $.getJSON(SETTINGS.URI + 'layouts/' + file + '.json', loadOrigOrPrev);

        window.localStorage.setItem(lastMapKey, file);
    }

    function buildLayout(layout) {
        this.setDirty(false);
        this.clearLayout();
        this.header = layout.header;

        var matrix = layout.matrix;
        var minX = Infinity;
        var minY = Infinity;
        var maxX = 0;
        var maxY = 0;

        for ( var i = 0, l = matrix.length; i < l; i++ ) {
            minX = Math.min(minX, matrix[i].x);
            minY = Math.min(minY, matrix[i].y);
            maxX = Math.max(maxX, matrix[i].x + matrix[i].w);
            maxY = Math.max(maxY, matrix[i].y + matrix[i].h);

            // TODO: Refactor to create matrix, then init in loop...
            var key = Key.create();
            key.init(this.$stage, {
                readonly: true,
                code: matrix[i].code,
                x: matrix[i].x,
                y: matrix[i].y,
                w: matrix[i].w,
                h: matrix[i].h,
                layers: matrix[i].layers,
            });
            key.on('select', this.selectKey.bind(this));
            key.on('setKey', this.keymapChanged.bind(this));
            this.matrix.push(key);
        }

        this.$stage.css({
            top: -minY * SETTINGS.GRID_SIZE + 20 + 'px',
            left: -minX * SETTINGS.GRID_SIZE + 20 + 'px'
        });

        $('#container').css({
            marginTop: '0',
            width: (maxX - minX) * SETTINGS.GRID_SIZE + 40 + 'px',
            height: (maxY - minY) * SETTINGS.GRID_SIZE + 40 + 'px'
        });

        $('#shortcuts').show();
    }

    function selectKey(key) {
        this._selectedKey = key;
    }

    function keyPressed(e) {
        if ( !this._selectedKey ) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();	// don't think this is needed

        if(!$('#layer-check-' + this._selectedLayer).is(':checked')) {
            alert('The current layer is not visibile. Activate it before making changes to the layout.');
            return;
        }

        // try to find out if we pressed left or right shift/ctrl/alt/...
        if ( e.originalEvent.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT ) {
            e.which += 1000;
        } else if ( e.originalEvent.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT ) {
            e.which += 2000;
        } else if ( e.originalEvent.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
            e.which += 3000;
        }

        if ( !(e.which in DEFAULTS.keyCodes) ) {
            return;
        }

        this._selectedKey.setKey(DEFAULTS.keyCodes[e.which], this._selectedLayer);
    }

    function deselectKeys(e) {
        if (!this._selectedKey) {
            return;
        }

        this._selectedKey.$element.removeClass('selected');
        this._selectedKey = '';
    }

    function shortcut(e) {
        if (!this._selectedKey) {
            return;
        }

        e.stopPropagation();

        if(!$('#layer-check-' + this._selectedLayer).is(':checked')) {
            alert('The current layer is not visibile. Activate it before making changes to the layout.');
            return;
        }

        var data = $(e.target).closest('.shortcut-button').data('key');

        if ( !data ) {
            return;
        }

        // delete key
        if ( data == '*CLEAR' ) {
            data = false;
        }

        this._selectedKey.setKey(data, this._selectedLayer);
    }

    function layerSelect(el, e) {
        var $el = $(el);

        $('#layers .selected').removeClass('selected');
        $el.addClass('selected');
        $('#container').css({
            backgroundColor: $(el).css('backgroundColor')
        });

        this._selectedLayer = $el.find('input').attr('value');
    }

    function displayLayers() {
        $('#container').removeClass('layer-0 layer-1 layer-2 layer-3 layer-4 layer-5 layer-6 layer-7');
        $('#layers input:checked').each(function () {
            $('#container').addClass('layer-' + this.value);
        });
    }

    function clearLayout() {
        this.header = {};
        this.matrix = [];

        // following jQuery documentation all event listeners are automatically removed so this is all we need to clear the board
        // TODO: check memory leaks
        this.$stage.find('.key').remove();
    }

    function downloadMap() {
        var matrix = [];

        $.each(this.matrix, (k, v) => {
            matrix.push({
                code: v.code,
                x: v.x,
                y: v.y,
                w: v.width,
                h: v.height,
                layers: v.layers
            });
        });

        $.ajax({
            type: 'post',
            url: SETTINGS.URI + 'download.php',
            data: {
                'map': JSON.stringify({ header: this.header, matrix: matrix }),
            },
            success: function (response) {
                if ('error' in response) {
                    alert( response.error );
                    return;
                }

                window.location.href = SETTINGS.URI + response.filename;
            },
            error: function (response) {
                alert('Connection error!');
            }
        });
    }

    function serializeKeyboardMap() {
        var matrix = [];

        $.each(this.matrix, (k, v) => {
            matrix.push({
                code: v.code,
                x: v.x,
                y: v.y,
                w: v.width,
                h: v.height,
                layers: v.layers
            });
        });

        return { header: this.header, matrix: matrix };
    }

    function keymapChanged() {
        this.setDirty(true);

        // Save a previous edit -- should be debounced.
        var prev = window.localStorage.getItem(prevEditsKey);
        prev = prev ? JSON.parse(prev) : {};

        prev[this.header.Name] = prev[this.header.Name] || {};
        prev[this.header.Name][this.header.Layout] = this.serializeKeyboardMap();
        var serialized = JSON.stringify(prev);
        window.localStorage.setItem(prevEditsKey, serialized);
    }

    function setDirty(dirty) {
        if (dirty === this._dirty) {
            return;
        }
        var old = this._dirty;

        this._dirty = dirty;

        this.emit('dirty', this, this._dirty, old);
    }

    function revertLayout() {
        if (!this._unmodified) {
            return;
        }

        this.buildLayout(this._unmodified);
    }

    function getUrlParameters() {
        var qd = {};
        var params = window.location.search.substr(1).split("&");

        for (var i = 0, len = params.length; i < len; i++) {
            var s = params[i].split("=");
            var k = s[0];
            var v = s[1] && decodeURIComponent(s[1]);
            (k in qd) ? qd[k].push(v) : qd[k] = [v]
        }

        return qd;
    }
})(DEFAULTS, SETTINGS, Key, ImportMap, window, document);
