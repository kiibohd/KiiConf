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

var Key = (function (SETTINGS, window, document) {
    'use strict';

    var _count = 0;

    return {
        create: () => Object.create(Key),
        init: init,

        move: move,
        resize: resize,
        select: select,
        setKey: setKey,

        //TODO: Move these to a another object that delegates to Key
        resizeStart: resizeStart,
        resizeEnd: resizeEnd,
        resizeMove: resizeMove,
        dragStart: dragStart,
        dragMove: dragMove,
        dragEnd: dragEnd,
    };

    function init($stage, options) {
        _count++;

        this._options = options;
        this.code = options.code;
        this.layers= {};
        this.x = options.x;
        this.y = options.y;

        // size in units ( 1 = 0.25u, 4 = 1u, 6 = 1.5u )
        this.width = options.w;
        this.height = options.h;
        this.onSelect = options.onSelect;  // TODO: private?
        this.$stage = $stage; // TODO: private?

        this.$element = $('<div>')
            .attr('id', 'key-' + _count)
            .addClass('key')
            .html('<div class="cap"></div>');

        this._mouse = {};

        this.move();
        this.resize();

        for (var i in options.layers) {
            this.setKey(options.layers[i].key, i);
        }

        // the editor can move/resize keys, the configurator can only select keys
        //TODO: Move this to a another object that delegates to Key
        if (!options.readonly) {
            // add the resize handle
            this.$element.append('<div class="resize-ew"></div>');

            this.$element.on('mousedown', this.dragStart.bind(this));

            this.$element.find('.resize-ew')
                .on('mousedown', this.resizeStart.bind(this));
        } else {
            this.$element.on('click', this.select.bind(this));
        }

        this.$stage.append(this.$element);
    }

    /**
     * Set the coordinates for the key.
     * @param x
     * @param y
     */
    function move(x, y) {
        this.x = x === undefined ? this.x : x;
        this.y = y === undefined ? this.y : y;

        this.$element.css({
            left: this.x * SETTINGS.GRID_SIZE + 'px',
            top:  this.y * SETTINGS.GRID_SIZE + 'px'
        });
    }

    /**
     * Resize the control incrementally.
     * @param dx - Change in width
     * @param dy - Change in height
     */
    function resize(dx, dy) {
        //TODO: Evaluate naming..
        this.width += dx || 0;
        this.height += dy|| 0;

        //TODO: Promote to constants
        if (this.width < 4) {
            this.width = 4;
        } else if (this.width > 40) {
            this.width = 40;
        }
        //TODO: Constrain Height
        /*
         if (this.height < 4 ) {
            this.height = 4;
         } else if (this.height > 40 ) {
            this.height = 40;
         }
         */

        this.$element.css({
            width: this.width * SETTINGS.GRID_SIZE + 'px',
            height: this.height * SETTINGS.GRID_SIZE + 'px'
        })
    }

    /**
     * Begin resize action
     * @param {*|jQuery.Event} e - jQuery event object
     */
    function resizeStart(e) {
        if (e.which != 1 /* Left Mouse Button */) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        this._mouse.resize = {
            x: e.pageX,
            y: e.pageY
        };

        $(document)
            .on('mousemove.resize', this.resizeMove.bind(this))
            .on('mouseup.resize', this.resizeEnd.bind(this));
    }

    /**
     * Incremental resize action
     * @param {*|jQuery.Event} e - jQuery event object
     */
    function resizeMove(e) {
        // TODO: add vertical resize
        var dx = e.pageX - this._mouse.resize.x;
        //var dy = e.pageY - _mouse.resize.y;

        var adx = Math.abs(dx);
        if (adx < SETTINGS.GRID_SIZE) {
            return;
        }

        dx = Math.floor(adx / SETTINGS.GRID_SIZE) * Math.sign(dx);
        //dy = Math.floor(Math.abs(dy) / SETTINGS.GRID_SIZE) * Math.sign(dy);

        this._mouse.resize.x = e.pageX;
        //_mouse.resize.y = e.pageY;

        this.resize(dx);
    }

    /**
     * End resize action
     * @param {*|jQuery.Event} e - jQuery event object
     */
    function resizeEnd(e) {
        $(document).off('.resize');
        this._mouse.resize = undefined;
    }

    /**
     * Begin drag & drop action
     * @param {*|jQuery.Event} e - jQuery event object
     */
    function dragStart(e) {
        if (e.which != 1 /* Left Mouse Button */) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        this.$element.addClass('selected');

        var elementOffset = this.$element.offset();
        this._mouse.drag = this.$element.parent().offset();
        this._mouse.drag.left += e.pageX - elementOffset.left;
        this._mouse.drag.top += e.pageY - elementOffset.top;

        $(document)
            .on('mousemove.dragdrop', this.dragMove.bind(this))
            .on('mouseup.dragdrop', this.dragEnd.bind(this));
    }

    /**
     * Incremental drag & drop action
     * @param {*|jQuery.Event} e - jQuery event object
     */
    function dragMove(e) {
        var x = Math.floor((e.pageX - this._mouse.drag.left) / SETTINGS.GRID_SIZE);
        var y = Math.floor((e.pageY - this._mouse.drag.top) / SETTINGS.GRID_SIZE);

        if (x < 0) {
            x = 0;
        } else if (x > SETTINGS.STAGE_WIDTH - this.width) {
            x = SETTINGS.STAGE_WIDTH - this.width;
        }

        if (y < 0) {
            y = 0;
        } else if (y > SETTINGS.STAGE_HEIGHT - this.height) {
            y = SETTINGS.STAGE_HEIGHT - this.height;
        }

        if (this.x != x || this.y != y ) {
            this.move(x, y);
        }
    }

    /**
     * End drag & drop action
     * @param {*|jQuery.Event} e - jQuery event object
     */
    function dragEnd(e) {
        this.$element.removeClass('selected');
        $(document).off('.dragdrop');
        this._mouse.drag = undefined;
    }

    /**
     * Element selected event.
     * @param {*|jQuery.Event} e - jQuery event object
     */
    function select(e) {
        e.preventDefault();
        e.stopPropagation();

        this.$stage.find('.selected').removeClass('selected');
        this.$element.addClass('selected');

        if ((this.onSelect !== undefined) && (this.onSelect !== null)) {
            this.onSelect(this);
        }
    }

    /**
     * Set the key value on a given layer
     * @param value
     * @param layer
     */
    function setKey(value, layer) {
        layer = layer || 0;

        // special case: remove key
        if (value === false) {
            this.$element.find('.layer-' + layer).remove();
            delete(this.layers[layer]);
            return
        }

        if (!(value in DEFAULTS.keyDefaults)) {
            console.log('Key not present in the default definition');
            return;
        }
        var $label;
        if (!(layer in this.layers)) {
            $label = $('<div class="label layer-' + layer + '"></div>');
            this.$element.append( $label );
        } else {
            $label = this.$element.find('.layer-' + layer);
        }

        this.layers[layer] = {
            key: value,
            label: DEFAULTS.keyDefaults[value].label || value
        };

        $label.html(this.layers[layer].label);
    }
})(SETTINGS, window, document);
