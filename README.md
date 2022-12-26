# XCMS

XCMS is a modern component management system providing a web platform to work remotely on your project.

### Installation:

Dependencies:
-Mongodb
-lsof

To install xcms from npm run: `npm i @mrcosmic/x-cms`
or clone the git `git clone https://github.com/jockehewh/xcms && cd xcms && npm install`

### Setting uo the platform

__1. Starting from NPM install:__ 
If you cloned the repository from Github.com start from the step 2.
```
npm init -y xcms-platform
cd xcms-platform
npm i -s @mrcosmic/x-cms
```
__2. Create the directory to host your project:__
create a builder directory at the root of your xcms-platform and init your project inside of it.
```
mkdir builder
cd builder
npm create vite@latest my-project //follow the prompt.
```
__3. Prepare your application to be served:__
Build you project for the first time so your app is ready and online when you start your XCMS.
```
cd my-project
npm install
npm run build
```
__4. Create the config file:__
XCMS is almost ready, go back the root of your server project and create an `xcms.config.json`.
Use the example below and remember that you must adapt the "projectOptions" to suit your project configuration.
```
{
  "port": 1337,                                     # Your server project port
  "mongoURI": "mongodb://localhost:27017/xcms",     # Your MongoDB URI
  "mongoOptions": {                                 # Your MongoDB connection options
    "useNewUrlParser": true,
    "useUnifiedTopology": true
     },
  "projectOptions": {                               # Your project options
    "buildFolder": "build",                         # The folder containing the build files inside your "my-project" folder
    "devServerPort": "8080"                         # the listening port of your "my-project" dev server
  },
  "passportKeys": "xavier-cms-key",                 # Your secret encryption key
}
```
__5. Import XCMS:__
Now, create your `index.js` file and import XCMS. 
```
//index.js
const xcms = require('@mrcosmic/x-cms')
```
__6. Start the platform:__
Run your xcms-platform.
```
node index.js
```
__7. Connect to the platform:__
Once you see the log saying "listening on port: '$PORT'" open your browser and visit the following address `localhost:$PORT/connect` to start using the interface.

The default user is `superuser` and the password is `2one0time2password1`

N.B: Once you are logged-in i invite you to change your password via the 'Management > accounts' section.


From here you will have access to your project files on the lefthand side of the screen, unfold the first level by clicking your project name aka. "my-project"
NB: If you package.json has a script named dev already you can skip the next step.

Edit your "package.json" file to make sure you have a ```dev``` script inside the ```scripts``` object to run your dev server (make sure that the devServerPort specified in the `xcms.config.json` and the port of your "my-project" dev server are matching.) and click SAVE on the righthand side of the screen.

To start you dev server click on "Management" on the top right corner and then in the first column starting from the lefthand side of the screen you will see a button saying "npm run dev" click it to run your dev server.

You can now see your "my-project" homepage in an other tab at `localhost:$DevServerPort`

Happy coding!

### Usage:


__Media manager:__

The media manager allows you to save medias into your server.

To ease the media accesses all the media names are sanitized from white space (' '), double dots ('..'), forward-slashes ('/') and backward-slashes ('\') in favor of underscores ('_').

- all images are converted to the webp format and are accessible vie the URL ```http(s)://example.com/imgs/{image-name}.webp```
- all videos are saved as is and are accessible via this URL ```http(s)://example.com/videos/{video-name}```


__Add a developer:__

Allows you to create more developers (N.B.. only developers can update the content of the apps).
To create an developer you have to fill the following form:
Developer name: name
password: password
super developer: yes | no (a super developer is able to create more developers and to change passwords)

__Change an developers password:__

Fill the form with an existing developer username and set the new password.
Then click the 'Update password' button to save your changes.

__1. A listing of your components:__

On the left side of the screen is a list of your components following the architecture of your project.
You can edit any component by clicking its name.
While editing you have 3 new buttons on the right hand side of the screen: save, reset, delete.
N.B: deleting a file from your project is ireversible as it is removed from your file system.

