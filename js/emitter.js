/*
    KII Keyboard Editor
    Copyright (C) 2016 Jeremy Bondeson

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

    ---------------------------------------------------------------------
    Based upon emitter: https://github.com/component/emitter

    (The MIT License)

    Copyright (c) 2014 Component contributors <dev@component.io>

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.
 */

var Emitter = (function () {
    return {
        on: on,
        addEventListener: on,
        once: once,
        off: off,
        removeEventListener: removeEventListener,
        removeListeners: removeListeners,
        removeAllListeners: removeAllListeners,
        emit: emit,
        listeners: listeners,
        hasListeners: hasListeners,
    };

    /**
     * Listen on the given `event` with `fn`.
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     */
    function on(event, fn) {
        this._callbacks = this._callbacks || {};
        (this._callbacks[`$${event}`] = this._callbacks[`$${event}`] || [])
            .push(fn);
        return this;
    }

    /**
     * Adds an `event` listener that will be invoked a single
     * time then automatically removed.
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     */
    function once(event, fn) {
        function proxy() {
            this.off(event, proxy);
            fn.apply(this, arguments);
        }

        proxy.fn = fn;
        this.on(event, on);
        return this;
    }

    /**
     * Remove the given callback for `event`, all callbacks for the event, or
     * all registered callbacks.
     * @param {String} [event]
     * @param {Function} [fn]
     * @return {Emitter}
     */
    function off(event, fn) {
        this._callbacks = this._callbacks || {};

        // all
        if (arguments.length == 0) {
            this._callbacks = {};
            return this;
        }

        // specific event
        var callbacks = this._callbacks[`$${event}`];
        if (!callbacks) return this;

        // remove all handlers
        if (arguments.length == 1) {
            delete this._callbacks[`$${event}`];
            return this;
        }

        for (var cb, len = callbacks.length, i = 0; i < len; i++) {
            cb = callbacks[i];
            if (cb === fn || cb.fn === fn) {
                callbacks.splice(i, 1);
                break;
            }
        }

        return this;
    }

    /**
     * Remove the given callback for `event`
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     */
    function removeEventListener(event, fn) {
        return this.off(event, fn);
    }

    /**
     * Remove all callbacks for the event
     * @param {String} [event]
     * @return {Emitter}
     */
    function removeListeners(event) {
        return this.off(event);
    }

    /**
     * Remove all registered callbacks.
     * @return {Emitter}
     */
    function removeAllListeners() {
        return this.off();
    }

    /**
     * Emit `event` with the given args.
     * @param {String} event
     * @param {...*} args
     * @return {Emitter}
     */
    function emit(event, ...args) {
        this._callbacks = this._callbacks || {};
        var callbacks = this._callbacks[`$${event}`];

        if (callbacks) {
            callbacks = callbacks.slice(0);
            for (var i = 0, len = callbacks.length; i < len; i++) {
                callbacks[i](...args);
            }
        }

        return this;
    }

    /**
     * Return array of callbacks for `event`.
     * @param {String} event
     * @return {Array}
     */
    function listeners(event) {
        this._callbacks = this._callbacks || {};
        return this._callbacks[`$${event}`] || [];
    }

    /**
     * Check if this emitter has `event` handlers.
     * @param {String} event
     * @return {Boolean}
     */
    function hasListeners(event) {
        return !!this.listeners(event).length;
    }
})();