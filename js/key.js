var APP = APP || {};

(function (window, document) {

var _count = 0;

function Key ($stage, options) {
	_count++;

	this.$stage = $stage;

	this.code = options.code;
	this.layers = {};

	this.x = options.x;
	this.y = options.y;

	this.width  = options.w; 	// size in units ( 1 = 0.25u, 4 = 1u, 6 = 1.5u )
	this.height = options.h;

	this.$element = $('<div>')
		.attr('id', 'key-' + _count)
		.addClass('key')
		.html('<div class="cap"></div>');

	this.move(this.x, this.y);
	this.resize();

	for ( var i in options.layers ) {
		this.setKey(options.layers[i].key, i);
	}

	// the editor can move/resize keys, the configurator can only select keys
	if ( !options.readonly ) {
		// add the resize handle
		this.$element
			.append('<div class="resize-ew"></div>');

		this.$element
			.on('mousedown', $.proxy(this.dragStart, this));

		this.$element.find('.resize-ew')
			.on('mousedown', $.proxy(this.resizeStart, this));
	} else {
		this.$element
			.on('click', $.proxy(this.select, this));
	}

	$stage.append(this.$element);
}

Key.prototype = {
	move: function (x, y) {
		this.x = x === undefined ? this.x : x;
		this.y = y === undefined ? this.y : y;

		this.$element.css({
			left: this.x * APP.GRID_SIZE + 'px',
			top:  this.y * APP.GRID_SIZE + 'px'
		});
	},

	resize: function (x, y) {
		this.width += x || 0;
		this.height += y || 0;

		if ( this.width < 4 ) {
			this.width = 4;
		} else if ( this.width > 40 ) {
			this.width = 40;
		}

		this.$element.css({
			width: this.width * APP.GRID_SIZE + 'px',
			height: this.height * APP.GRID_SIZE + 'px'
		})
	},


	/**
	 *
	 * Resize
	 *
	 */
	resizeStart: function (e) {
		if ( e.which != 1 ) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		this._mouseStartX = e.pageX;
		this._mouseStartY = e.pageY;

		$(document)
			.on('mousemove.resize', $.proxy(this.resizeMove, this))
			.on('mouseup.resize', $.proxy(this.resizeEnd, this));

	},

	// TODO: add vertical resize
	resizeMove: function (e) {
		var deltaX = e.pageX - this._mouseStartX;
		//var deltaY = e.pageY - this._mouseStartY;

		if ( Math.abs(deltaX) < APP.GRID_SIZE ) {
			return;
		}

		deltaX = Math.floor( Math.abs(deltaX) / APP.GRID_SIZE ) * (deltaX > 0 ? 1 : deltaX < 0 ? -1 : 0);
		//deltaY = Math.floor( Math.abs(deltaY) / APP.GRID_SIZE ) * (deltaY > 0 ? 1 : deltaY < 0 ? -1 : 0);

		this._mouseStartX = e.pageX;
		//this._mouseStartY = e.pageY;

/*		if ( this.height < 4 ) {
			this.height = 4;
		} else if ( this.height > 40 ) {
			this.height = 40;
		}
*/
		this.resize(deltaX);
	},

	resizeEnd: function (e) {
		$(document).off('.resize');
	},


	/**
	 *
	 * Drag and drop
	 *
	 */
	dragStart: function (e) {
		if ( e.which != 1 ) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		this.$element.addClass('selected');

		var elementOffset = this.$element.offset();
		this._dragOffset = this.$element.parent().offset();
		this._dragOffset.left += e.pageX - elementOffset.left;
		this._dragOffset.top += e.pageY - elementOffset.top;

		$(document)
			.on('mousemove.dragdrop', $.proxy(this.dragMove, this))
			.on('mouseup.dragdrop', $.proxy(this.dragEnd, this));
	},

	dragMove: function (e) {
		var x = Math.floor( (e.pageX - this._dragOffset.left) / APP.GRID_SIZE );
		var y = Math.floor( (e.pageY - this._dragOffset.top)  / APP.GRID_SIZE );

		if ( x < 0 ) {
			x = 0;
		} else if ( x > APP.STAGE_WIDTH - this.width ) {
			x = APP.STAGE_WIDTH - this.width;
		}

		if ( y < 0 ) {
			y = 0;
		} else if ( y > APP.STAGE_HEIGHT - this.height ) {
			y = APP.STAGE_HEIGHT - this.height;
		}

		if ( this.x != x || this.y != y ) {
			this.move(x, y);
		}
	},

	dragEnd: function (e) {
		this.$element.removeClass('selected');
		$(document).off('.dragdrop');
	},

	select: function (e) {
		e.preventDefault();
		e.stopPropagation();

		this.$stage.find('.selected').removeClass('selected');
		this.$element.addClass('selected');

		APP().selectKey( this );
	},

	setKey: function (value, layer) {
		layer = layer || 0;

		// special case: remove key
		if ( value === false ) {
			this.$element.find('.layer-' + layer).remove();
			delete(this.layers[layer]);
			return
		}

		if ( !(value in DEFAULTS.keyDefaults) ) {
			console.log('Key not present in the default definition');
			return;
		}
		var $label;
		if ( !(layer in this.layers) ) {
			$label = $('<div class="label layer-' + layer + '"></div>');
			this.$element.append( $label );
		} else {
			$label = this.$element.find('.layer-' + layer);
		}

		this.layers[layer] = {
			key: value,
			label: DEFAULTS.keyDefaults[value].label || value
		};

		$label.html( this.layers[layer].label );
	}
};

window.APP.Key = Key;

})(window, document);