/*
	KII Keyboard Editor
	Copyright (C) 2016 Matteo Spinelli

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

var APP = APP || {};

(function (window, document) {

// main application instance
var _instance;

// singleton
function APP (debug) {
	_instance = _instance || new APP.Class(debug);

	return _instance;
}

APP.Class = function (debug) {
	var that = this;

	// First assign through settings. This is a hack until this can be converted
	// to a full module format.
	var s = window.APPSETTINGS;
	for (var p in s) {
		if (s.hasOwnProperty(p)) {
			APP[p] = s[p];
		}
	}

	this.header = {};
	this.matrix = [];

	this._selectedLayer = 0;

	this.$stage = $('#stage');
	this.$document = $(document);

	APP.STAGE_WIDTH = Math.floor(this.$stage.width() / APP.GRID_SIZE);
	APP.STAGE_HEIGHT = Math.floor(this.$stage.height() / APP.GRID_SIZE);

	// create shortcuts
	var $shortcuts = $('#shortcuts');
	var $shortcutsGroup;
	var group = '';
	$.each( APP.keyDefaults, function (k, v) {
		if ( 'group' in v ) {

			if ( group != v.group ) {
				$shortcutsGroup = $('#group-' + v.group).length ? $('#group-' + v.group) : $('<ul id="group-' + v.group + '" class="group"><li class="title">' + v.group + '</li></ul>').appendTo($shortcuts);
				group = v.group;
			}

			$shortcutsGroup.append('<li><span class="shortcut-button" data-key="' + k + '">' + ( v.label || k ) + '</span></li>');
		}
	});

	$shortcuts.on('click', $.proxy(this.shortcut, this) );

	// import button
	$('#import-map').click(function () {
		new popup(
			'Import a previously created layout</br>Must be valid json',
			'import map',
			'',
			$.proxy(that.buildLayout, that)
		);
	});

	// download button
	$('#download-map')
		.on('click', $.proxy(this.downloadMap, this));

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

	// deselect keys
	this.$document
		.on('keydown', $.proxy(this.keyPressed, this))
		.on('click', $.proxy(this.deselectKeys, this));

	this.displayLayers();

	// Load the layers from the server.
	var params = this.getUrlParameters();
	var queryString = '';

	if (params.hasOwnProperty('layout')) {
		queryString = '?layout=' + params['layout'][0];
	}

	$.ajax({
		type: 'get',
		url: APP.URI + 'renderedlayouts.php' + queryString, //TODO: send query params
		success: function (response) {
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

			that.loadLayout( $layoutList.find('.selected').data('layout') );
		},
		error: function (response) {
			alert('Connection error!');
		}
	});
};

APP.Class.prototype = {
	loadLayout: function (file) {
		file = file || $('#layout-list .selected').data('layout');

		if ( ! file ) {
			alert('Error loading layout. Please refresh the page.');
			return;
		}

		$.getJSON('layouts/' + file + '.json', $.proxy(this.buildLayout, this) );
	},

	buildLayout: function (layout) {
		this.clearLayout();
		this.header = layout.header;

		var matrix = layout.matrix;
		var key;
		var minX = Infinity;
		var minY = Infinity;
		var maxX = 0;
		var maxY = 0;

		for ( var i = 0, l = matrix.length; i < l; i++ ) {
			minX = Math.min(minX, matrix[i].x);
			minY = Math.min(minY, matrix[i].y);
			maxX = Math.max(maxX, matrix[i].x + matrix[i].w);
			maxY = Math.max(maxY, matrix[i].y + matrix[i].h);

			this.matrix.push( new APP.Key(this.$stage, {
				readonly: true,

				code: matrix[i].code,
				x: matrix[i].x,
				y: matrix[i].y,
				w: matrix[i].w,
				h: matrix[i].h,
				layers: matrix[i].layers
			}) );
		}

		this.$stage.css({
			top: -minY * APP.GRID_SIZE + 20 + 'px',
			left: -minX * APP.GRID_SIZE + 20 + 'px'
		});

		$('#container').css({
			marginTop: '0',
			width: (maxX - minX) * APP.GRID_SIZE + 40 + 'px',
			height: (maxY - minY) * APP.GRID_SIZE + 40 + 'px'
		});

		$('#shortcuts').show();
	},

	selectKey: function (key) {
		this._selectedKey = key;
	},

	keyPressed: function (e) {
		if ( !this._selectedKey ) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();	// don't think this is needed

		if( !$('#layer-check-' + this._selectedLayer).is(':checked') ) {
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

		if ( !(e.which in APP.keyCodes) ) {
			return;
		}

		this._selectedKey.setKey( APP.keyCodes[e.which], this._selectedLayer );
	},

	deselectKeys: function (e) {
		if ( !this._selectedKey ) {
			return;
		}

		this._selectedKey.$element.removeClass('selected');
		this._selectedKey = '';
	},

	shortcut: function (e) {
		if ( !this._selectedKey ) {
			return;
		}

		e.stopPropagation();

		if( !$('#layer-check-' + this._selectedLayer).is(':checked') ) {
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
	},

	layerSelect: function (el, e) {
		$el = $(el);

		$('#layers .selected').removeClass('selected');
		$el.addClass('selected');
		$('#container').css({
			backgroundColor: $(el).css('backgroundColor')
		});

		this._selectedLayer = $el.find('input').attr('value');
	},

	displayLayers: function () {
		$('#container').removeClass('layer-0 layer-1 layer-2 layer-3 layer-4 layer-5 layer-6 layer-7');
		$('#layers input:checked').each(function () {
			$('#container').addClass('layer-' + this.value);
		});
	},

	clearLayout: function () {
		this.header = {};
		this.matrix = [];

		// following jQuery documentation all event listeners are automatically removed so this is all we need to clear the board
		// TODO: check memory leaks
		this.$stage.find('.key').remove();
	},

	downloadMap: function () {
		var matrix = [];

		$.each(this.matrix, function (k, v) {
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
			url: APP.URI + 'download.php',
			data: {
				'map': JSON.stringify({ header: this.header, matrix: matrix }),
			},
			success: function (response) {
				if ( 'error' in response ) {
					alert( response.error );
					return;
				}

				window.location.href = response.filename;
			},
			error: function (response) {
				alert('Connection error!');
			}
		});
	},

	getUrlParameters: function () {
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
};

function popup (title, action, value, cb) {
	var that = this;

	this.$cover = $('<div>')
		.addClass('cover')
		.appendTo('body');

	this.$popup = $('<div>')
		.addClass('popup')
		.appendTo('body');

	$('<h1>')
		.html(title)
		.appendTo(this.$popup);

	var $map = $('<textarea>')
		.html(value)
		.appendTo(this.$popup);

	var $buttons = $('<div>').appendTo(this.$popup);

	$('<button>')
		.attr('type', 'button')
		.html('cancel')
		.addClass('button-cancel')
		.click( $.proxy(this.destroy, this) )
		.appendTo($buttons);

	$('<button>')
		.attr('type', 'button')
		.html(action)
		.addClass('button-read')
		.click(function () {
			if ( !$map.val() ) {
				alert('c\'mon be creative!');
				return;
			}

			cb(jQuery.parseJSON($map.val()));
			that.destroy();
		})
		.appendTo($buttons);
}

popup.prototype = {
	destroy: function () {
		this.$cover.remove();
		this.$popup.remove();
	}
};

window.APP = APP;

})(window, document);
