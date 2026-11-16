/* The one place the version number lives.
   RELEASING AN UPDATE: bump this number, then upload the files.
   Both the game (index.html) and the service worker (sw.js) read it, so they can never disagree.
   Players keep the version they have; a dot appears on Settings and they choose when to install. */
self.FUSE_VERSION = '1.3.0';
