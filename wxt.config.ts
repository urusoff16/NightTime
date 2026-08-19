import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    short_name: '__MSG_extensionShortName__',
    permissions: ['storage', 'activeTab', 'alarms'],
    host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: '__MSG_extensionShortName__',
    },
  },
});
