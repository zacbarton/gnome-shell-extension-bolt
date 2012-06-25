const Gio = imports.gi.Gio;
const GioSSS = Gio.SettingsSchemaSource;

const BLUR_BACKGROUND = "blur-background";
const MATCH_WALLPAPER = "match-wallpaper";
const CUSTOM_BACKGROUND_COLOR = "custom-background-color";

const AUTOMATTIC_SIZING = "automattic-sizing";
const CUSTOM_SIZE = "custom-size";
const THEME_SIZE = "theme-size";

const SHOW_ANIMATION_TIME = "show-animation-time";
const ALWAYS_OPEN_TO_HOME = "always-open-to-home";
const CHANGE_ACTIVITIES_TEXT = "change-activities-text";

const SHOW_APPLICATIONS = "show-applications";
const SHOW_FILES = "show-files";
const SHOW_CONTACTS = "show-contacts";
const SHOW_SYSTEM = "show-system";

const SEARCH_FILES_AND_FOLDERS = "search-files-and-folders";
const SEARCH_CONTACTS = "search-contacts";

const HOME_APPLICATIONS_TYPE = "home-applications-type";
const HOME_SHOW_RECENT_FILES = "home-show-recent-files";
const HOME_SHOW_DOWNLOADS = "home-show-downloads";

// we pass in the extension object because this is used via SettingsManager.js (gjs) and 
// prefs.js (seed) and we hit the same getCurrentExtension doesnt work in sub directories issue
function getSettings(Extension) {
	let schema = Extension.metadata["settings-schema"];
	let schemaDir = Extension.dir.get_child("schemas");

	let schemaSource = GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false);
	let schemaObj = schemaSource.lookup(schema, true);

	if (!schemaObj) {
		throw new Error("Schema " + schema + " could not be found for extension " + Extension.metadata.uuid + ". Please check your installation.");
	}

	return new Gio.Settings({settings_schema: schemaObj});
}