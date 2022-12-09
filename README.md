# xcms

### Installation:

Dependencies:
-Mongodb
-lsof

to install xcms from npm run: `npm i @mrcosmic/x-cms`
or clone the git `git clone https://github.com/jockehewh/xcms && cd xcms && npm install`

### First start

Using XCMS is tricky, you first need to init your server project as it will host the GUI to manage your project:
```
npm init -y xcms-server && cd xcms-server && npm i -s @mrcosmic/x-cms
```
Before starting your xcms-server create a builder folder at the root of your xcms-server and init your project inside of it.
```
mkdir builder && cd builder && npm create vite@latest my-project //follow the prompt.
```
After that you have to build you project for the first time to have you app served to the user.
```
cd my-project && npm install && npm run build
```
XCMS is almost ready, go back the root of your server project and create an `xcms.config.json`.
You can use the example below but you must adapt the "projectOptions" to suit your project configuration.
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
Now, create your `index.js` file and import XCMS. 
```
//index.js
const xcms = require('@mrcosmic/x-cms')
```
Run your xcms-server.
```
node index.js
```
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

__Projects manager:__

The project manager allows you to create and manage your projects.
Use the "New project" button to start a project.
Then add your developers to the project by adding their names using a comma as a separator in the "projects participants text-area".
You can create three type of projects:
 - "Vanilla" to start a basic NPM project named after your project name.
 - "Bootstrap app" to bootstrap your project with a prebundled dependencies like 'create-react-app'. 
 - "GIT clone" to bootstrap you app from a git repository.
(N.B. you will have to manage global dependencies throught SSH or use NPX for a one time use, otherwise you can use NPM as usual.)

Click "save new project" to start the process.

Now the developers accessing the bundle editor will have the components sorted by projects.

All the projects created will be listed on the left panel, clicking one project will open a speudo-terminal interface where you can manage dependencies, create or delete files. Clicking "save changes" will update your project architecture. 
(N.B. you can create files but not edit them, use the bundle editor to modify the content of your files.)

N.B: the developers must disconnect and reconnect before they can access the project files.[TODO]


__Add a developer:__

Allows you to create more developers (N.B.. only developers can update the content of the apps).
To create an developer you have to fill the following form:
Developer name: name
password: password
super developer: yes | no (a super developer is able to create more developers and to change passwords)
Access: bundle editor(give access to the bundle editor) | data manager(give access to the data manager) | both (give access to both)

__Change an developers password:__

Fill the form with an existing developer username and set the new password.
Then click the 'Update password' button to save your changes.

### Bundle editor

The bundle editor allows you to use modern Javascript frameworks to build any kind of application. It is mainly composed in three parts: 
1. A listing of your components.
2. A JS editor and a CSS editor.
3. A builder to build your application.

__1. A listing of your components:__

On the left side of the screen is a list of your components following the architecture of your project.
Each component has its css linked to it. (only for the Vanilla projects.)
So a "myJS.js" file will have a "myJS.css" file linked to it.
Use the CSS editor to add your css and as an example with "myJS.js" to use your CSS you will do:
```
//inside myJS.js
import './myJS.css'
```
The default components are not listed in this editor.
To use the default components refer to their documentation.
React components: https://material-ui.com/getting-started/usage
Vue components: https://vuematerial.io/components/app

__2. A JS editor and A CSS editor:__

In the middle are the CSS and JS editors.
this is where you will edit your components.
on the top-right corner of the editor are 3 buttons:

###### New

It will prompt you with the name of your component. (due to the nature of the bundler you will have to enter the correct extension for your file, it can be: .js, .jsx, .vue or .svelte).
Then you will be promted in which project to add the component. 

###### Save

It will save the currently editing component.

###### Reset

It will restore the component to its original state.

__3. A builder to build your application:__

On the right side of the screen is the Builder.
To bundle your application, select the needed components using the checkboxes and select the entrypoint of the bundle by using the radio-buttons.
The resulting bundle will be named after the entrypoint 
as an example: for an "index.js" file the bundle will be named "index.html"
remember to select your framework before starting the build.
(The build system will copy all the selected components in the same folder before starting the build. Adjust your imports accordingly when using custom components)