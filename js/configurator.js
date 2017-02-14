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

var Configurator = (function (DEFAULTS, SETTINGS, utils, Key, ImportMap, window, document, _) {
    'use strict';

    const lastMapKey = 'configurator-last-loaded-map';
    const prevEditsKey = 'configurator-prev-edits';
    const uiStateKey = 'configurator-ui-state';

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
        addNewDefine: addNewDefine,
    };

    Object.assign(conf, ext);

    return conf;

    // TODO: Break this up...
    function init() {
        this.header = {};
        this.defines = {};
        this.matrix = [];

        this._selectedLayer = 0;
        this._dirty = false;

        this.$stage = $('#stage');
        this.$document = $(document);

        this.templates = buildTemplates();

        SETTINGS.STAGE_WIDTH = Math.floor(this.$stage.width() / SETTINGS.GRID_SIZE);
        SETTINGS.STAGE_HEIGHT = Math.floor(this.$stage.height() / SETTINGS.GRID_SIZE);

        var uiState = utils.getLsItem(uiStateKey, true) || {};

        // create shortcuts
        var $shortcuts = $('#shortcuts');
        var $shortcutsGroup;
        var group = '';
        $.each(DEFAULTS.keyDefaults, (k, v) => {
            if ('group' in v) {
                v.safeGroup = v.group.replace(' ', '_');
                if (group != v.group) {
                    $shortcutsGroup = $('#group-' + v.group);
                    $shortcutsGroup = $shortcutsGroup.length > 0
                        ? $shortcutsGroup
                        : $(this.templates.group(v)).appendTo($shortcuts);
                    group = v.group;
                }

                $shortcutsGroup.children('ul').append(this.templates.key({key: k, value: v}));
            }
        });
        $shortcuts.on('click', this.shortcut.bind(this));

        $('.toggle-vis')
            .on('click', function(e) {
                var $elem = $(this);
                var group = $elem.data('group');
                var $groupList = $('#group-' + group + ' .group-data');
                $groupList.toggleClass('hide');
                var visible = !$groupList.hasClass('hide');
                $elem.text(visible ? '[hide]' : '[show]');
                utils.updateLsItem(uiStateKey, visible, `groups.${group}.visible`);
            })
            .each(function () {
                var $elem = $(this);
                var group = $elem.data('group');
                if (!_.get(uiState, `groups.${group}.visible`, true)) {
                    $elem.trigger("click");
                }
            });

        // import button
        $('#import-map').click(() => {
            var im = ImportMap.create();
            im.popup('Import a previously created layout</br>Must be valid json',
                'import map',
                '',
                json => this.buildLayout(JSON.parse(json)));
        });

        // download button
        $('#download-map')
            .on('click', this.downloadMap.bind(this));

        $('#add-define-btn')
            .on('click', () => this.addNewDefine('', ''));

        // The following functions need access to both lexical and
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
        var $revLayout = $("#reset-layout")
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
        var params = utils.getUrlParameters();

        var map;
        if (params.hasOwnProperty('layout')) {
            map = params['layout'][0];
        } else {
            map = utils.getLsItem(lastMapKey) || '';
        }

        map = _.trim(map, "' ") || 'WhiteFox-TrueFoxBlank';

        $.getJSON(SETTINGS.URI + 'layouts.php', (layouts) => {
            var [selKbd, selVar] = map.split('-', 2);
            var rendered = this.templates.layout({ layouts, selKbd, selVar });

            $("#layout-list").replaceWith(rendered);

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

            this.loadLayout($layoutList.find('.selected').data('layout'));
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
            var prev = utils.getLsItem(prevEditsKey, true);
            var prevLayout = _.get(prev, `${layout.header.Name}.${layout.header.Layout}`);
            if (prevLayout) {
                this.buildLayout(prevLayout);
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

        utils.updateLsItem(lastMapKey, file);
    }

    function buildLayout(layout) {
        this.setDirty(false);
        this.clearLayout();
        this.header = layout.header;
        this.defines = layout.defines || [];

        // Bind the headers
        $('#kll-header-name').val(this.header.Name);
        $('#kll-header-layout').val(this.header.Layout);
        $('#kll-header-base').val(this.header.Base);
        $('#kll-header-version').val(this.header.Version);
        $('#kll-header-author').val(this.header.Author);
        $('#kll-header-kll').val(this.header.KLL);
        $('#kll-header-date').val(this.header.Date);
        $('#kll-header-generator').val(this.header.Generator);

        _.forEach(this.defines, (v) => {
            this.addNewDefine(v.name, v.value);
        });

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

    function buildTemplates() {
        var t = {};
        // Group template.
        t.group = _.template(
`<div id="group-<%= x.safeGroup %>" class="group">
    <div class="title">
        <span class="title-name"><%= x.group %></span>
        <span class="toggle-vis" data-group="<%= x.safeGroup %>">[hide]</span>
    </div>
    <ul class="group-data"></ul>
</div>`, { variable: 'x' });

        t.layout = _.template(
`<div id="layout-list" class="pseudo-select">
    <span id="active-layout-title"><%= x.selKbd %> <%= x.selVar %></span>
    <ul>
        <% _.forOwn(x.layouts, function(variants, keyboard) { %>
            <li>
                <a href="#" onclick="return false"><%- keyboard %></a>
                <ul>
                <% _.forEach(variants, function(variant) {
                    var layout = keyboard + '-' + variant;
                    var isSel = variant == x.selVar && keyboard == x.selKbd; %>
                    <li data-layout="<%- layout %>" class="<%= isSel ? 'selected' : '' %>">
                        <a href="?layout=<%= window.encodeURI(layout) %>"><%- variant %></a>
                    </li>
                <% }); %>
                </ul>
            </li>
        <% }); %>
    </ul>
</div>`, { variable: 'x'});

        t.key = _.template(
`<li>
    <span class="shortcut-button" data-key="<%- x.key %>"><%= x.value.label || x.key %></span>
</li>`, {variable: 'x'});

        t.define = _.template(
`<div class="flex-container">
    <input type="text" class="item" name="kll-define-name" value="<%- x.name %>"/>
    <input type="text" class="item" name="kll-define-value" value="<%- x.value %>"/>
    <img class="item btn rem-define-btn" src="img/ic_remove_circle_outline_black_24px.svg">
</div>`, {variable: 'x'});
        return t;
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
        this.defines = [];
        this.matrix = [];

        // following jQuery documentation all event listeners are automatically removed so this is all we need to clear the board
        // TODO: check memory leaks
        this.$stage.find('.key').remove();
    }

    function downloadMap() {
        var map = this.serializeKeyboardMap();

        $.ajax({
            type: 'post',
            url: SETTINGS.URI + 'download.php',
            data: {
                'map': JSON.stringify(map),
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

        var header = _.clone(this.header);
        //TODO: pre-sanitize
        header.Name = $('#kll-header-name').val();
        header.Layout = $('#kll-header-layout').val();
        header.Base = $('#kll-header-base').val();
        header.Version = $('#kll-header-version').val();
        header.Author = $('#kll-header-author').val();
        header.KLL = $('#kll-header-kll').val();
        header.Date = $('#kll-header-date').val();
        header.Generator = $('#kll-header-generator').val();

        var defines = [];

        $('#kll-define-list')
            .children('.flex-container:has(input)')
            .each(function () {
                var value = $(this).children('input[name="kll-define-value"]').val();
                var name = $(this).children('input[name="kll-define-name"]').val();
                defines.push({name, value});
            });

        return {
            header: header,
            defines: defines,
            matrix: matrix
        };
    }

    function keymapChanged() {
        this.setDirty(true);

        // Save a previous edit -- should be debounced.
        utils.updateLsItem(prevEditsKey, this.serializeKeyboardMap(), `${this.header.Name}.${this.header.Layout}`);
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

    function addNewDefine(name, value) {
        name = name || '';
        value = value || '';

        var $newDef = $(this.templates.define({name: name, value: value}))
            .appendTo('#kll-define-list');

        $newDef.children('.rem-define-btn')
            .on('click', function (){
                var $btn = $(this);
                $btn.off('click');
                $btn.parent('.flex-container').remove();
            });

        $newDef.children('input')
            .on('focus', () => this.deselectKeys());
    }
})(DEFAULTS, SETTINGS, UTILS, Key, ImportMap, window, document, _);
