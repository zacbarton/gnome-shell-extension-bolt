const St = imports.gi.St;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const ContactDisplay = imports.ui.contactDisplay;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const MockShellApp = Extension.imports.libs.MockShellApp;

const ContactsSearch = new Lang.Class({
	Name: "ContactsSearch",
	Extends: ContactDisplay.ContactSearchProvider,

	_init: function(maxResults) {
		this.parent();
	},

	getInitialResultSet: function(terms) {
		let searchResults = this._contactSys.initial_search(terms);
		return this.convertResultSet(searchResults);
	},

	getSubsearchResultSet: function(previousResults, terms) {
		// as we modify the search results into a format we use we cant do subsearches
		// let searchResults = this._contactSys.subsearch(previousResults, terms);
		let searchResults = this._contactSys.initial_search(terms);
		
		return this.convertResultSet(searchResults);
	},

	convertResultSet: function(searchResults) {
		let contacts = [];

		for (let i = 0, count = searchResults.length; i < count; i++) {
			let contact = this._contactSys.get_individual(searchResults[i]);

			if (contact.full_name && !contact.is_user) {
				let mockShellApp = new MockShellApp.MockShellApp(contact.id
					, contact.full_name
					, function(size) {
						let tc = St.TextureCache.get_default();

						if (contact.avatar != null) {
							return tc.load_gicon(null, contact.avatar, size);
						} else {
							return tc.load_icon_name(null, "avatar-default", St.IconType.FULLCOLOR, size);
						}
					}
					, function(){
						ContactDisplay.launchContact(contact.id);
					}
				);

				mockShellApp.contact = contact;
				contacts.push(mockShellApp);
			}
		}

		return contacts;
	}
});