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

var Editor = (function (DEFAULTS, SETTINGS, utils, Key, document) {
    'use strict';

    const storageKey = 'editor-previous-map';

    return {
        create: () => Object.create(Editor),
        init: init,
        loadKeyboardMap: loadKeyboardMap,
        saveKeyboardMap: saveKeyboardMap,
        clearKeyboardMap: clearKeyboardMap,
        serializeKeyboardMap: serializeKeyboardMap,

        selectKey: selectKey,
        deselectKeys: deselectKeys,
        keyPressed: keyPressed,

        keymapChanged: keymapChanged,
    };

    function init(debug) {
        this.header = {};
        this.matrix = [];

        this.$stage = $('#stage');
        this.$document = $(document);

        // Override the grid size
        // TODO: Figure out better settings sol'n
        SETTINGS.GRID_SIZE = 10;

        SETTINGS.STAGE_WIDTH = Math.floor(this.$stage.width() / SETTINGS.GRID_SIZE);
        SETTINGS.STAGE_HEIGHT = Math.floor(this.$stage.height() / SETTINGS.GRID_SIZE);

        // load button
        $('#load-map').click(() => {
            var im = ImportMap.create();
            im.popup('Load new keyboard map',
                'load map',
                '',
                // In arrow functions this is bound lexically
                this.loadKeyboardMap.bind(this));
        });

        // save button
        $('#save-map').click(this.saveKeyboardMap.bind(this));

        // deselect keys
        this.$document
            .on('keydown', this.keyPressed.bind(this))
            .on('click', this.deselectKeys.bind(this));


        if ( debug ) {
            this.loadKeyboardMap();
        } else {
            // Try and load the previous map.
            var map = utils.getLsItem(storageKey);
            if (map) {
                this.loadKeyboardMap(map);

                //TODO: Replace with template.
                var $alert = $('#alert')
                    .removeClass('hide');

                var dismiss = () => {
                    $alert.addClass('hide')
                        .off('click', dismiss);
                };

                $alert.on('click', dismiss);
            }
        }
    }

    function loadKeyboardMap(map) {
        var layout = $.parseJSON(map);
        this.clearKeyboardMap();
        this.header = layout.header;

        $('#kii-name').val(this.header.Name);
        $('#kii-layout').val(this.header.Layout);

        var matrix = layout.matrix;

        for ( var i = 0, l = matrix.length; i < l; i++ ) {
            // TODO: Refactor to create matrix, then init in loop...
            var key = Key.create();
            key.init(this.$stage, {
                code: matrix[i].code,
                x: matrix[i].x,
                y: matrix[i].y,
                w: matrix[i].w,
                h: matrix[i].h,
                layers: matrix[i].layers,
            });
            key.on('select', this.selectKey.bind(this));
            var dk = this.keymapChanged.bind(this);
            key.on('move', dk);
            key.on('resize', dk);
            key.on('setKey', dk);
            this.matrix.push(key);
        }

        this.keymapChanged();
    }

    function selectKey(key) {
        this._selectedKey = key;
    }

    function deselectKeys(e) {
        if (!this._selectedKey) {
            return;
        }

        this._selectedKey.$element.removeClass('selected');
        this._selectedKey = '';
    }

    function keyPressed(e) {
        if ( !this._selectedKey ) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();	// don't think this is needed

        if (e.keyCode ===  8 || e.keyCode === 46) {
            var idx = this.matrix.indexOf(this._selectedKey);
            this.matrix.splice(idx, 1);
            this._selectedKey.$element.remove();
            this._selectedKey = '';
        }
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
                layers: { '0': { key: v.layers[0].key } }
            });
        });

        this.header.Name = $('#kii-name').val();
        this.header.Layout = $('#kii-layout').val();

        return JSON.stringify({ header: this.header, matrix: matrix });
    }

    function saveKeyboardMap() {
        $.ajax({
            type: 'post',
            url: SETTINGS.URI + 'save.php',
            data: {
                'map': this.serializeKeyboardMap(),
            },
            success: function (response) {
                alert( ( 'error' in response ) ? response.error : 'Saved!' );
            },
            error: function (response) {
                alert('Connection error!');
            }
        });
    }

    function clearKeyboardMap() {
        this.header = {};
        this.matrix = [];

        this.$stage.find('.key').remove();
    }

    function keymapChanged() {
        var map = this.serializeKeyboardMap();

        utils.updateLsItem(storageKey, map);
    }
})(DEFAULTS, SETTINGS, UTILS, Key, document);
