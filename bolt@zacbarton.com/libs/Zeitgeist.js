/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*-
 *
 * Copyright (C) 2010 Seif Lotfy <seif@lotfy.com>
 * Copyright (C) 2011 Siegfried-Angel Gevatter Pujals <siegfried@gevatter.com>
 * Copyright (C) 2010-2011 Collabora Ltd.
 *     Authored by: Seif Lotfy <seif@lotfy.com>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
 * 02111-1307, USA.
 */

const DBus = imports.dbus;

const SIG_EVENT = '(asaasay)';
const MAX_TIMESTAMP = 9999999999999;

const ResultType = {
    // http://zeitgeist-project.com/docs/0.6/datamodel.html#resulttype
    // It's unfortunate to have to define these by hand; maybe if D-Bus had a way to introspect enums...
    MOST_RECENT_EVENTS                   : 0,
    LEAST_RECENT_EVENTS                  : 1,
    MOST_RECENT_SUBJECTS                 : 2,
    LEAST_RECENT_SUBJECTS                : 3,
    MOST_POPULAR_SUBJECTS                : 4,
    LEAST_POPULAR_SUBJECTS               : 5,
    MOST_POPULAR_ACTOR                   : 6,
    LEAST_POPULAR_ACTOR                  : 7,
    MOST_RECENT_ACTOR                    : 8,
    LEAST_RECENT_ACTOR                   : 9,
    MOST_RECENT_ORIGIN                   : 10,
    LEAST_RECENT_ORIGIN                  : 11,
    MOST_POPULAR_ORIGIN                  : 12,
    LEAST_POPULAR_ORIGIN                 : 13,
    OLDEST_ACTOR                         : 14,
    MOST_RECENT_SUBJECT_INTERPRETATION   : 15,
    LEAST_RECENT_SUBJECT_INTERPRETATION  : 16,
    MOST_POPULAR_SUBJECT_INTERPRETATION  : 17,
    LEAST_POPULAR_SUBJECT_INTERPRETATION : 18,
    MOST_RECENT_MIME_TYPE                : 19,
    LEAST_RECENT_MIME_TYPE               : 20,
    MOST_POPULAR_MIME_TYPE               : 21,
    LEAST_POPULAR_MIME_TYPE              : 22,

    // http://zeitgeist-project.com/docs/0.8.1.1/datamodel.html#resulttype
    MOST_RECENT_CURRENT_URI              : 23
    // MostPopularCurrentUri 25
    // MostRecentEventOrigin 27
    // MostPopularEventOrigin 29 
};

const StorageState = {
    // http://zeitgeist-project.com/docs/0.6/datamodel.html#storagestate
    // As with ResultType, it would be nice if we could introspect enums through D-Bus
    NOT_AVAILABLE : 0,
    AVAILABLE     : 1,
    ANY           : 2
};

/* Zeitgeist Subjects (files, people, etc.) */
const Subject = function(uri, interpretation, manifestation, origin, mimetype, text, storage) {
    this._init(uri, interpretation, manifestation, origin, mimetype, text, storage);
};

Subject.prototype = {
    _init: function(uri, interpretation, manifestation, origin, mimetype, text, storage, uri2) {
        this.uri = uri;
        this.interpretation = interpretation;
        this.manifestation = manifestation;
        this.origin = origin;
        this.mimetype = mimetype;
        this.text = text;
        this.storage = storage;
        this.uri2 = uri2;
    }
};

Subject.fromPlain = function(rawSubject) {
    return new Subject(rawSubject[7],  // current uri
                       rawSubject[1],  // interpretation
                       rawSubject[2],  // manifestation
                       rawSubject[3],  // origin
                       rawSubject[4],  // mimetype
                       rawSubject[5],  // text
                       rawSubject[6],  // storage
                       rawSubject[0]); // uri
};

Subject.toPlain = function(subject) {
    let rawSubject = [];
    rawSubject[0] = subject.uri;
    rawSubject[1] = subject.interpretation;
    rawSubject[2] = subject.manifestation
    rawSubject[3] = subject.origin;
    rawSubject[4] = subject.mimetype;
    rawSubject[5] = subject.text;
    rawSubject[6] = subject.storage;
    return rawSubject;
};

/* Zeitgeist Events */
function Event(interpretation, manifestation, actor, subjects, payload) {
    this._init(interpretation, manifestation, actor, subjects, payload);
};

Event.prototype = {
    _init: function(interpretation, manifestation, actor, subjects, payload) {
        this.id = 0;
        this.timestamp = 0;
        this.interpretation = interpretation;
        this.manifestation = manifestation;
        this.actor = actor;
        this.payload = payload;
        this.subjects = subjects;
    },
};

Event.fromPlain = function(rawEvent) {
    let subjects = rawEvent[1].map(Subject.fromPlain);
    let event = new Event(rawEvent[0][2],   // interpretation
                          rawEvent[0][3],   // manifestation
                          rawEvent[0][4],   // actor
                          subjects,         // subjects
                          rawEvent[2]);     // payload
    event.id = rawEvent[0][0]; // id
    event.timestamp = parseInt(rawEvent[0][1], 10); // timestamp - it comes as a string over d-bus (yuck)
    return event;
};

Event.toPlain = function(event) {
    let rawEvent = [];
    rawEvent[0] = [];
    rawEvent[0][0] = event.id.toString();
    rawEvent[0][1] = event.timestamp.toString();
    rawEvent[0][2] = event.interpretation;
    rawEvent[0][3] = event.manifestation;
    rawEvent[0][4] = event.actor;
    rawEvent[1] = event.subjects.map(Subject.toPlain);
    rawEvent[2] = event.payload;
    return rawEvent;
};

// Zeitgeist D-Bus interface definitions. Note that most of these are
// incomplete, and only cover the methods/properties/signals that
// we're currently using.

/* Zeitgeist D-Bus Interface */
const LOG_NAME = 'org.gnome.zeitgeist.Engine';
const LOG_PATH = '/org/gnome/zeitgeist/log/activity';
const LogIface = {
    name: 'org.gnome.zeitgeist.Log',
    methods: [
        { name: 'GetEvents',
          inSignature: 'au',
          outSignature: 'a'+SIG_EVENT },
        { name: 'FindRelatedUris',
          inSignature: 'au',
          outSignature: '(xx)a(' + SIG_EVENT + ')a'+ SIG_EVENT + 'uuu' },
        { name: 'FindEventIds',
          inSignature: '(xx)a' + SIG_EVENT + 'uuu',
          outSignature: 'au' },
        { name: 'FindEvents',
          inSignature: '(xx)a' + SIG_EVENT + 'uuu',
          outSignature: 'a' + SIG_EVENT },
        { name: 'InsertEvents',
          inSignature: 'a' + SIG_EVENT,
          outSignature: 'au' },
        { name: 'DeleteEvents',
          inSignature: 'au',
          outSignature: '(xx)' },
        { name: 'DeleteLog',
          inSignature: '',
          outSignature: '' },
        { name: 'Quit',
          inSignature: '',
          outSignature: '' },
        // FIXME: Add missing DBus Methods
        // - InstallMonitor
        // - RemoveMonitor
    ],
    properties: [
        { name: 'Get',
          inSignature: 'ss',
          outSignature: 'v',
          access: 'read' },
        { name: 'Set',
          inSignature: 'ssv',
          outSignature: '',
          access: 'read' },
        { name: 'GetAll',
          inSignature: 's',
          outSignature: 'a{sv}',
          access: 'read' },
    ]
};

const Log = DBus.makeProxyClass(LogIface);
const _log = new Log(DBus.session, LOG_NAME, LOG_PATH);

function findEvents(timeRange, eventTemplates, storageState, numEvents, resultType, callback) {
    function handler(results, error) {
        if (error != null) {
            if (error.message.toLowerCase().indexOf("NameHasNoOwner".toLowerCase()) !== -1) { // is just easier to read
                let timeout = Mainloop.timeout_add(500, function() {
                    findEvents(timeRange, eventTemplates, storageState, numEvents, resultType, callback);
                    Mainloop.source_remove(timeout);
                });
            } else {
                global.log("Error searching with Zeitgeist::findEvents: " + error);
            }
        } else {
            callback(results.map(Event.fromPlain));
        }
    }
    
    if (available) {
        _log.FindEventsRemote(timeRange, eventTemplates.map(Event.toPlain), storageState, numEvents, resultType, handler);
    } else {
        throw new Error("Zeitgeist isnt installed");
    }
}

function findEventIds(timeRange, eventTemplates, storageState, numEvents, resultType, callback) {
    function handler(results, error) {
        if (error != null)
            global.log("Error querying Zeitgeist for event IDs: " + error);
        else
            callback(results);
    }
    _log.FindEventIdsRemote(timeRange, eventTemplates.map(Event.toPlain),
                          storageState, numEvents, resultType, handler);
}

function deleteEvents(eventIds) {
    _log.DeleteEventsRemote(eventIds);
}

/* Zeitgeist Full-Text-Search Interface */
const INDEX_NAME = 'org.gnome.zeitgeist.Engine';
const INDEX_PATH = '/org/gnome/zeitgeist/index/activity';
const IndexIface = {
    name: 'org.gnome.zeitgeist.Index',
    methods: [
        { name: 'Search',
          inSignature: 's(xx)a'+SIG_EVENT+'uuu',
          outSignature: 'a'+SIG_EVENT+'u' },
    ],
};

const Index = DBus.makeProxyClass(IndexIface);
const _index = new Index(DBus.session, INDEX_NAME, INDEX_PATH);

/**
 * fullTextSearch:
 *
 * Asynchronously search Zeitgeist's index for events relating to the query.
 *
 * @param query The query string, using asterisks for wildcards. Wildcards must
 *        be used at the start and/or end of a string to get relevant information.
 * @param eventTemplates Zeitgeist event templates, see
 *        http://zeitgeist-project.com/docs/0.6/datamodel.html#event for more
 *        information
 * @param callback The callback, takes a list containing Zeitgeist.Event
 *        objects
 */
function fullTextSearch(query, eventTemplates, numEvents, resultType, callback) {
    function handler(results, error) {
        if (error != null) {
            if (error.message.toLowerCase().indexOf("NameHasNoOwner".toLowerCase()) !== -1) { // is just easier to read
                let timeout = Mainloop.timeout_add(500, function() {
                    fullTextSearch(query, eventTemplates, numEvents, resultType, callback);
                    Mainloop.source_remove(timeout);
                });
            } else {
                global.log("Error searching with Zeitgeist::fullTextSearch: " + error);
            }
        } else {
            callback(results[0].map(Event.fromPlain));
        }
    }
    
    if (available) {
        _index.SearchRemote(query, [0, MAX_TIMESTAMP], eventTemplates.map(Event.toPlain), 0, numEvents, resultType, handler);
    } else {
        throw new Error("Zeitgeist isnt installed");
    }
}







// modifications by Zac Barton
const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

// We don't really have a class to add signals on. So, create
// a simple dummy object, add the signal methods, and export those
// publically.
let signals = {};
Signals.addSignalMethods(signals);

const connect = Lang.bind(signals, signals.connect);
const disconnect = Lang.bind(signals, signals.disconnect);

const available = GLib.spawn_command_line_sync("which zeitgeist-daemon")[1].toString().indexOf("zeitgeist") !== -1;
let ready = false;

// if we know zeitgeist is installed then inform connecting objects when its ready
if (available) {
    let subject = new Subject("", "", "", "", "", "", "");
    let template = new Event("", "", "", [subject], []);
    findEvents([-1, 0], [template], StorageState.ANY, 1, 2, function() {
        let timeout = Mainloop.timeout_add(1000, function() {
            ready = true;
            signals.emit("ready");
            Mainloop.source_remove(timeout);
        });
    });
}