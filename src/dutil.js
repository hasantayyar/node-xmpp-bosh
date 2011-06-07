// -*-  tab-width:4  -*-

/*
 * Copyright (c) 2011 Dhruv Matani
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

var us = require('underscore');

// The maximum number of characters that a single log line can contain
var MAX_CHARS_IN_LOG_LINE = 4096;

var _log_level = 4;
var _log_levels = {
	"NONE":  0, 
	"FATAL": 1, 
	"ERROR": 2,
	"WARN":  3, 
	"INFO":  4, 
	"DEBUG": 5
};


function arguments_to_array(args) {
	return Array.prototype.slice.call(args, 0);
}

function get_numeric_log_level(level) {
	level = level.toUpperCase();
	var nll = 6;

	if (_log_levels.hasOwnProperty(level)) {
		nll = _log_levels[level];
	}

	return nll;
}
	
function set_log_level(level) {
	_log_level = get_numeric_log_level(level);
}

function log_it(level) {
	/* Logs stuff (2nd parameter onwards) according to the logging level
	 * set using the set_log_level() function. The default logging level
	 * is INFO logging only. The order of logging is as follows:
	 * NONE < INFO < WARN < ERROR < FATAL < DEBUG < anything else
	 *
	 * If the 2nd paramater is the only other parameter and it is a 
	 * function, then it is evaluated and the result is expected to be
	 * an array, which contains the elements to be logged.
	 *
	 */
	level = level.toUpperCase();
	var numeric_level = get_numeric_log_level(level);

	if (numeric_level > 0 && numeric_level <= _log_level) {
		var args = arguments_to_array(arguments).slice(1);
		if (args.length === 1 && typeof args[0] === 'function') {
			// Lazy evaluation.
			args = args[0]();

			// args can be either an array, or something else. If it is
			// anything but an array, we set it to an array with args being
			// the only element of that array.
			if (!(args instanceof Array)) {
				args = [ args ];
			}
		}

		args.unshift(level, new Date());

		args.forEach(function(arg, i) {
			var astr = '';
			var more_hint = '';

			try {
				astr = arg.toString();

				// console.log(astr.length);
				if (astr.length > MAX_CHARS_IN_LOG_LINE) {
					// We limit the writes because we are running into a 
					// bug at this point of time.
					more_hint = ' ... ' + (astr.length - MAX_CHARS_IN_LOG_LINE) + ' more characters';
					astr = astr.substr(0, MAX_CHARS_IN_LOG_LINE);
				}

				process.stdout.write(astr);
				if (more_hint) {
					process.stdout.write(more_hint);
				}
				process.stdout.write(i < args.length - 1 ? ' ' : '');
			}
			catch (ex) {
				console.error("DUTIL::args:", args);
				console.error("DUTIL::arg:", arg);
				console.error("DUTIL::log_it:astr.length:", astr.length);
				console.error("DUTIL::log_it:Exception:\n", ex.stack);
				process.exit(3);
			}
		});

		process.stdout.write('\n');
	}
}


function copy(dest, src, restrict) {
	/* Copy keys from the hash 'src' to the hash 'dest'.
	 * If restrict is truthy, then it should be an array
	 * that contains the keys to be copied.
	 */
	var k;
	for (k in src) {
		if (src.hasOwnProperty(k)) {
			if (restrict) {
				if (restrict.indexOf(k) !== -1) {
					dest[k] = src[k];
				}
			}
			else {
				dest[k] = src[k];
			}
		}
	}
	return dest;
}

function extend(dest, src) {
	/* Extend the hash 'dest' with keys & values from the 
	 * hash 'src'. If a key is already present in 'dest', 
	 * don't overrite it with one from 'src'.
	 */
	var k;
	for (k in src) {
		if (src.hasOwnProperty(k)) {
			if (!dest.hasOwnProperty(k)) {
				dest[k] = src[k];
			}
		}
	}
	return dest;
}


function repeat(item, n) {
	/* Return an array that contains 'item' 'n' times.
	 * Note: 'item' is not deep copied, only the reference
	 * is assigned 'n' times. Modifying it via member 
	 * functions will result in all elements of the returned
	 * array being modified.
	 */
	var ret = [];
	var i;
	for (i = 0; i < n; ++i) {
		ret.push(item);
	}
	return ret;
}

function alternator() {
	/* Accepts a variable number of arrays.
	 *
	 * e.g. alternator([1,2,3,4], [10, 20, 30]) will return
	 * [1,10,2,20,3,30,40] and
	 *
	 * alternator([1,2,3,4], [10, 20]) will return
	 * [1,10,2,20,3,4]
	 *
	 * Basically, it tries to alternate between the various arrays
	 * if there are any remaining elements in any of them. Returns the
	 * alternated array.
	 */
	var nseq = arguments.length;
	var exhausted = false;
	var buff = [];
	var ctrs = repeat(0, nseq);
	var i;

	while (!exhausted) {
		exhausted = true;
		for (i = 0; i < nseq; ++i) {
			if (ctrs[i] < arguments[i].length) {
				// log_it('debug', "Adding to buff:", arguments[i][ctrs[i]]);
				buff.push(arguments[i][ctrs[i]]);
				ctrs[i] += 1;
				exhausted = false;
			}
		}
	}

	return buff;
}

function map(a, f) {
	// Apply 'f' [with 2 arguments (element, index)] or call member function 'f' [with no arguments]
	var r = [ ];
	var i;
	for (i = 0; i < a.length; ++i) {
		if (typeof f === 'function') {
			r.push(f(a[i], i));
		}
		else if (typeof f === 'string') {
			r.push(a[i][f]());
		}
	}
	return r;
}

function sprintf(fmt_str) {
	// log_it('debug', "sprintf", arguments);
	var fs_parts = fmt_str.split("%s");
	var args = map(arguments_to_array(arguments).slice(1), 'toString');

	// log_it('debug', "fs_parts, args:", fs_parts, args);

	if (fs_parts.length !== args.length + 1) {
		var estr = sprintf("The number of arguments in your format string (%s)[%s] " + 
			"does NOT match the number of arguments passed[%s]", 
			fmt_str, fs_parts.length-1, args.length);
		log_it("WARN", estr);
		throw new Error(estr);
	}

	return us(fs_parts).chain().zip(us(args).push('')).flatten().value().join('');
}

function ToStringPromise(proc, args) {
	this._proc = proc;
	this._args = args;
}

ToStringPromise.prototype = {
	toString: function(obj) {
		obj = obj || null;
		return this._proc.apply(obj, this._args);
	}
};


// Delayed sprintf()
function sprintfd() {
	return new ToStringPromise(sprintf, arguments);
}


function not(proc) {
	return function() {
		return !proc.apply(this, arguments);
	};
}

function rev_hash(o) {
	var r = { };
	var k;
	for (k in o) {
		if (o.hasOwnProperty(k)) {
			r[o[k]] = k;
		}
	}
	return r;
}

function _real_xml_parse(xml, ltx) {
	/* This function parses the XML stanza passed to it
	 * as a string. 'ltx' is the ltx module object. It is used
	 * to do the actual XML parsing. null is returned if the 
	 * string passed is NOT valid XML.
	 *
	 * Note: The string 'xml' is trimmed before parsing.
	 */
	var node = null;
	xml = xml.trim();
	if (!xml) {
		return node;
	}

	try {
		node = ltx.parse(xml);
	}
	catch (ex) {
		log_it("WARN", "_real_xml_parse::Error parsing XML:", xml, ex.toString());
		log_it("WARN", ex.stack);
	}
	return node;
}

function _xml_parse() {
	/* Returns a function that parses the XML stanza passed to it
	 * as a string.
	 */
	var ltx = null;

	return function(xml) {
		// We do the dynamic require() of the 'ltx' module since 
		// it is required be present on only those systems that actually
		// use this function.
		if (!ltx) {
			ltx = require('ltx');
		}
		return _real_xml_parse(xml, ltx);
	};
}

function isFalsy(x) {
	return !x;
}

function isTruthy(x) {
	return !isFalsy(x);
}



function json_parse(jstr, def) {
	def = typeof def === 'undefined' ? '' : def;
	try {
		def = JSON.parse(jstr);
	}
	catch (ex) { }
	return def;
}

function jid_parse(jid) {
	/* Parses a full JID and returns an object containing 3 fields:
	 *
	 * username: The part before the @ sign
	 * domain  : The domain part of the JID (between @ and /)
	 * resource: The resource of the JID. May be undefined if not set
	 *
	 */
	var parts = jid.match(/^([^@]+)@([^\/]+)(\/([\S]+))?$/);
	if (!parts || !(parts instanceof Array) || parts.length < 5) {
		parts = repeat('', 5);
	}

	return {
		username: parts[1], 
		domain:   parts[2], 
		resource: parts[4]
	};
}

function num_cmp(lhs, rhs) {
	return lhs - rhs;
}

function time_diff(past, present) {
	/* Returns a humanly readable difference between 2 Date objects
	 *
	 * Specifically, it returns the difference (present - past)
	 *
	 * If present < past then the results are not defined
	 *
	 * Example Return: 3 day 10:23:33
	 *
	 */
	var diff = Math.floor((present - past) / 1000);

	var mapping = [
		[ 'year', 365 * 24 * 3600 ], 
		[ 'month', 30 * 24 * 3600 ], 
		[ 'week', 7 * 24 * 3600 ], 
		[ 'day', 1 * 24 * 3600 ], 
		[ ':', 3600 ], 
		[ ':', 60 ], 
		[ '', 1 ]
	];

	var out = mapping.map(function(v) {
		var r = [ v[0], Math.floor(diff / v[1]) ];
		diff %= v[1];
		return r;
	})
	.filter(function(v) {
		return v[0] !== ':' && v[0] !== '' ? v[1] > 0 : true;
	})
	.map(function(v) {
		return v[0] !== ':' && v[0] !== '' ? 
			(v[1] + ' ' + v[0] + (v[1] > 1 ? 's' : '') + ' ') : 
			((v[1] < 10 ? '0' : '') + v[1] + v[0]);
	})
	.join('');

	return out;
}

function ends_with(haystack, needle) {
	/* Checks whether the string needle ends with the string
	 * haystack
	 *
	 */
	var re = new RegExp(needle + '$');
	return haystack.search(needle) !== -1;
}

function find_module(file_name) {
	/* Searches for a module that ends with file_name
	 *
	 * Returns an object with 2 attributes
	 * handle: The handle to the require()d module and
	 * key   : The full absolute path of the module
	 *
	 * If the module was not found, then handle is null
	 *
	 */
	var mhandle = { handle: null, key: '' };
	var mname;
	for (mname in require.cache) {
		if (require.cache.hasOwnProperty(mname)) {
			if (ends_with(mname, file_name)) {
				mhandle.handle = require.cache[mname].exports;
				mhandle.key    = mname;
				break;
			}
		}
	}
	return mhandle;
}


function require_again(file_path) {
	/* This function require()s a file again.
	 * 
	 * Arguments:
	 * file_path: The complete (full absolute) path of the file to be require()d.
	 *
	 * It does this by deleting the older handle to the module from require.cache
	 * and calling require() in the file_path
	 *
	 */
	var old_mhandle = find_module(file_path);
	if (old_mhandle.key) {
		delete require.cache[old_mhandle.key];
	}
	return require(file_path);
}

function pluralize(n, suffix) {
	return n == 1 ? suffix : suffix + 's';
}

function toNumber(s) {
	var _n = Number(s);
	return isNaN(_n) ? 0 : _n;
}


// Add the following to underscore.js
us.mixin({
	isTruthy: isTruthy, 
	isFalsy: isFalsy
});


exports.copy               = copy;
exports.extend             = extend;
exports.repeat             = repeat;
exports.alternator         = alternator;
exports.arguments_to_array = arguments_to_array;
exports.map                = map;
exports.sprintf            = sprintf;
exports.sprintfd           = sprintfd;
exports.not                = not;
exports.rev_hash           = rev_hash;
exports.xml_parse          = _xml_parse();
exports.set_log_level      = set_log_level;
exports.log_it             = log_it;
exports.json_parse         = json_parse;
exports.jid_parse          = jid_parse;
exports.num_cmp            = num_cmp;
exports.time_diff          = time_diff;
exports.ends_with          = ends_with;
exports.find_module        = find_module;
exports.require_again      = require_again;
exports.pluralize          = pluralize;
exports.toNumber           = toNumber;
