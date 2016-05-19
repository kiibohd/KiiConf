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

var ImportMap = (function ($) {
    'use strict';

    return {
        create: () => Object.create(ImportMap),
        popup: popup,
        destroy: destroy,
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

                cb($map.val());
                that.destroy();
            })
            .appendTo($buttons);
    }
    
    function destroy() {
        this.$cover.remove();
        this.$popup.remove();
    }
})(jQuery);