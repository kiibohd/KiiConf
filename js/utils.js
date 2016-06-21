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
 */

var UTILS = (function(utils, window) {
    'use strict';

    utils.getUrlParameters = getUrlParameters;
    utils.getLsItem = getLsItem;
    utils.updateLsItem = updateLsItem;

    return utils;

    function getLsItem(key, isJson) {
        var item = window.localStorage.getItem(key);
        return isJson && !_.isNil(item) ? JSON.parse(item) : item;
    }

    function updateLsItem(key, value, path) {
        if (_.isNil(path)) {
            serialized = _.isString(value) ? value : JSON.stringify(value);
            window.localStorage.setItem(key, serialized)
        } else {
            var item = window.localStorage.getItem(key);
            item = item ? JSON.parse(item) : {};
            _.set(item, path, value);
            var serialized = JSON.stringify(item);
            window.localStorage.setItem(key, serialized)
        }
    }

    function getUrlParameters() {
        var qd = {};
        var params = window.location.search.substr(1).split("&");

        for (var i = 0, len = params.length; i < len; i++) {
            var s = params[i].split("=");
            var k = s[0];
            var v = s[1] && window.decodeURIComponent(s[1]);
            (k in qd) ? qd[k].push(v) : qd[k] = [v]
        }

        return qd;
    }
})(SETTINGS || {}, window);