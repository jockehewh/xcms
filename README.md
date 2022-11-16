# xcms

### Installation:

before installation make sure Mongodb is installed.

to install xcms from npm run: `npm i @mrcosmic/x-cms`
or clone the git `git clone https://github.com/jockehewh/xcms && cd xcms && npm install`

### First start

XCMS is preconfigured, to start the program just import it.

in your `index.js` file:
```
const xcms = require('@mrcosmic/x-cms')
//this will run with the default settings
```

if you want to customize your environement to use a Mongodb Atlas, or to run on a diferrent port,
create a `config.xcms.json` file at the root of your project and follow this model:

```
{
  "port": 1337,
  "mongoURI": "your mongodb URI",
  "mongoOptions": {
    "useNewUrlParser": true,
    "useUnifiedTopology": true
     },
  "passportKeys": "xavier-cms-key",
  "gtag": "MY-GA-ID"
}
```

open your browser and visit the following address `localhost:$PORT` you will be redirected to the connexion page:

the default user is `superuser` and the password is `2one0time2password1`

once you are logged-in i invite you to change your password via the 'Management > accounts' section.

To use the "Component Management System" browse to the "builders" folder at the root of your project. From here you can initialize you project with your favorite app generator using npm.

### Usage:

on the main page you will face see a rectangle, this is the workspace.
on the right hand side you have the menu. i will walk you throught the different options from top to bottom:


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