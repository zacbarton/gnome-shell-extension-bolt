const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Signals = imports.signals;

const Downloads = new Lang.Class({
	Name: "Downloads",

	_init: function() {
		this.updating = false;
		this.path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD);
		this.file = Gio.file_new_for_path(this.path);
		this.available = GLib.file_test(this.file.get_path(), GLib.FileTest.EXISTS);

		if (this.available) {
			this.monitor = this.file.monitor(Gio.FileMonitorFlags.NONE, null);
			this.monitor.connect("changed", Lang.bind(this, function() {
				this.getDownloads();
			}));
		}
	},

	getDownloads: function() {
		if (this.available && !this.updating) {
			this.updating = true;

			this.listDirAsync(this.file, Lang.bind(this, function(files) {
				this.files = files;
				this.sortByModifiedTime(this.files);

				this.updating = false;

				this.emit("updated", this.files);
			}));
		}
	},

	sortByModifiedTime: function(files) {
		files.sort(function(a, b) {
			if (a.get_attribute_uint64("time::modified") === b.get_attribute_uint64("time::modified")) {
				return 0;
			}

			return a.get_attribute_uint64("time::modified") < b.get_attribute_uint64("time::modified") ? -1 : 1;
		});

		files.reverse(); // newest to oldest. can i use the sort above to get in right order?
	},

	// move into utils?
	listDirAsync: function(file, callback) {
		let allFiles = [];

		let fileAttributes = [Gio.FILE_ATTRIBUTE_STANDARD_DISPLAY_NAME
			, Gio.FILE_ATTRIBUTE_STANDARD_IS_HIDDEN
			, Gio.FILE_ATTRIBUTE_STANDARD_FAST_CONTENT_TYPE
			, Gio.FILE_ATTRIBUTE_TIME_MODIFIED
		].join(",");

		file.enumerate_children_async(fileAttributes
			, Gio.FileQueryInfoFlags.NONE
			, GLib.PRIORITY_LOW
			, null
			, function(obj, res) {
				let enumerator = obj.enumerate_children_finish(res);

				function onNextFileComplete(obj, res) {
					let files = obj.next_files_finish(res);

					if (files.length) {
						allFiles = allFiles.concat(files);
						enumerator.next_files_async(100, GLib.PRIORITY_LOW, null, onNextFileComplete);
					} else {
						enumerator.close(null);
						callback(allFiles);
					}
				}
				enumerator.next_files_async(100, GLib.PRIORITY_LOW, null, onNextFileComplete);
			});
	},

	destroy: function() {
		this.monitor.cancel();
	}
});
Signals.addSignalMethods(Downloads.prototype);