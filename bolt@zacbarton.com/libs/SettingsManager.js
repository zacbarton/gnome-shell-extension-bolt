const Lang = imports.lang;
const Main = imports.ui.main;
const Signals = imports.signals;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Settings = Extension.imports.libs.Settings;

const SettingsManager = new Lang.Class({
	Name: "SettingsManager",

	_init: function(bolt) {
		this.bolt = bolt;
		this.enabled = false;

		this.settings = Settings.getSettings(Extension);
	},

	enable: function(enabled) {
		this.enabled = enabled;

		if (this.enabled) {
			this.apply();
			this.watch();
		} else {
			for (let i = 0; i < this.connections.length; i++) {
				this.settings.disconnect(this.connections[i]);
			}
			this.connections = [];
		}
	},

	watch: function() {
		this.connections = [
			this.settings.connect("changed::" + Settings.BLUR_BACKGROUND, Lang.bind(this, function() {
				this.setBlur();
			})),
			this.settings.connect("changed::" + Settings.MATCH_WALLPAPER, Lang.bind(this, function() {
				this.setBackgroundColor();
			})),
			this.settings.connect("changed::" + Settings.CUSTOM_BACKGROUND_COLOR, Lang.bind(this, function() {
				// be sure we are active
				if (!this.settings.get_boolean(Settings.MATCH_WALLPAPER)) {
					this.setBackgroundColor();
				}
			})),


			this.settings.connect("changed::" + Settings.AUTOMATTIC_SIZING, Lang.bind(this, function() {
				this.setSize();
			})),
			this.settings.connect("changed::" + Settings.CUSTOM_SIZE, Lang.bind(this, function() {
				// be sure we are active
				if (!this.settings.get_boolean(Settings.AUTOMATTIC_SIZING)) {
					this.setSize();
				}
			})),


			this.settings.connect("changed::" + Settings.SHOW_ANIMATION_TIME, Lang.bind(this, function() {
				this.setShowAnimationTime();
			})),
			this.settings.connect("changed::" + Settings.ALWAYS_OPEN_TO_HOME, Lang.bind(this, function() {
				this.setAlwaysOpenToHomeView();
			})),
			this.settings.connect("changed::" + Settings.SHOW_APPLICATIONS, Lang.bind(this, function() {
				this.setShowApplications();
			})),
			this.settings.connect("changed::" + Settings.SHOW_FILES, Lang.bind(this, function() {
				this.setShowFiles();
			})),
			this.settings.connect("changed::" + Settings.SHOW_CONTACTS, Lang.bind(this, function() {
				this.setShowContacts();
			})),
			this.settings.connect("changed::" + Settings.SHOW_SYSTEM, Lang.bind(this, function() {
				this.setShowSystem();
			})),


			this.settings.connect("changed::" + Settings.SEARCH_FILES_AND_FOLDERS, Lang.bind(this, function() {
				this.setSearchFilesAndFolders();
			})),
			this.settings.connect("changed::" + Settings.SEARCH_CONTACTS, Lang.bind(this, function() {
				this.setSearchContacts();
			})),


			this.settings.connect("changed::" + Settings.HOME_APPLICATIONS_TYPE, Lang.bind(this, function() {
				this.setHomeApplicationsType();
			})),
			this.settings.connect("changed::" + Settings.HOME_SHOW_RECENT_FILES, Lang.bind(this, function() {
				this.setHomeRecentFiles();
			})),
			this.settings.connect("changed::" + Settings.HOME_SHOW_DOWNLOADS, Lang.bind(this, function() {
				this.setHomeDownloads();
			}))
		];
	},

	apply: function() {
		this.setSize();
		this.setBlur();
		this.setBackgroundColor();

		this.setShowAnimationTime();
		this.setAlwaysOpenToHomeView();
		this.setShowApplications();
		this.setShowFiles();
		this.setShowContacts();
		this.setShowSystem();

		this.setSearchFilesAndFolders();
		this.setSearchContacts();

		this.setHomeApplicationsType();
		this.setHomeRecentFiles();
		this.setHomeDownloads();
	},

	setBlur: function() {
		this.bolt.blur.enable(this.settings.get_boolean(Settings.BLUR_BACKGROUND));
	},
	setBackgroundColor: function() {
		this.bolt.themeManager.backgroundMatcher.enable(this.settings.get_boolean(Settings.MATCH_WALLPAPER));

		if (this.bolt.themeManager.backgroundMatcher.enabled) {
			this.bolt.themeManager.backgroundMatcher.match();
		} else {
			this.bolt.themeManager.setBackgroundColor(this.settings.get_string(Settings.CUSTOM_BACKGROUND_COLOR));
		}
	},
	setSize: function() {
		if (this.settings.get_boolean(Settings.AUTOMATTIC_SIZING)) {
			this.bolt.setSizeAndPosition("auto");
		} else {
			this.bolt.setSizeAndPosition(this.settings.get_string(Settings.CUSTOM_SIZE).split("x"));
		}

		this.bolt.blur.setPorthole();
	},


	setShowAnimationTime: function() {
		this.bolt.animator.showAnimationTime = this.settings.get_double(Settings.SHOW_ANIMATION_TIME);
	},
	setAlwaysOpenToHomeView: function() {
		this.bolt.animator.alwaysOpenToHomeView = this.settings.get_boolean(Settings.ALWAYS_OPEN_TO_HOME);
	},
	setShowApplications: function() {
		this.bolt.applicationsView.tab.visible = this.settings.get_boolean(Settings.SHOW_APPLICATIONS);
	},
	setShowFiles: function() {
		this.bolt.filesView.tab.visible = this.settings.get_boolean(Settings.SHOW_FILES);
	},
	setShowContacts: function() {
		this.bolt.contactsView.tab.visible = this.settings.get_boolean(Settings.SHOW_CONTACTS);
	},
	setShowSystem: function() {
		this.bolt.systemView.tab.visible = this.settings.get_boolean(Settings.SHOW_SYSTEM);
	},


	setSearchFilesAndFolders: function() {
		this.bolt.searchView.filesAndFoldersEnable(this.settings.get_boolean(Settings.SEARCH_FILES_AND_FOLDERS));
	},
	setSearchContacts: function() {
		this.bolt.searchView.contactsEnable(this.settings.get_boolean(Settings.SEARCH_CONTACTS));
	},


	setHomeApplicationsType: function() {
		this.bolt.homeView.applicationsType = this.settings.get_string(Settings.HOME_APPLICATIONS_TYPE);
		this.bolt.homeView.recentApplicationsCache = null;
		this.bolt.homeView.getApplications();
	},
	setHomeRecentFiles: function() {
		this.bolt.homeView.recentFilesEnable(this.settings.get_boolean(Settings.HOME_SHOW_RECENT_FILES));
	},
	setHomeDownloads: function() {
		this.bolt.homeView.downloadsEnable(this.settings.get_boolean(Settings.HOME_SHOW_DOWNLOADS));
	}
});
Signals.addSignalMethods(SettingsManager.prototype);