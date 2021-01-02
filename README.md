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
    "useFindAndModify": false,
    "useUnifiedTopology": true
     },
  "passportKeys": "xavier-cms-key",
  "gtag": "MY-GA-ID"
}
```

open your browser and visit the following address `localhost:$PORT` you will be redirected to the connexion page:

the default user is `superuser` and the password is `2one0time2password1`

once logged-in i invite you to change your password via the 'CRM page'

### Usage:

on the main page you will face see a rectangle, this is the workspace.
on the right hand side you have the menu. i will walk you throught the different options from top to bottom:

##### Creating and saving pages

__Page name:__

__Page name__ is an input, enter the name of the page you are editing before saving it will allow you to access it later to edit or visit it.

__Save page:__

Clicking __Save page__ will save the page and make it browsable

__New page:__

Clicking __New page__ will empty the workspace.

__Delete content:__

Clicking __Delete content__ will empty the workspace.

##### adding content:

__Add a container:__

Clicking __Add a container__ will add a container to the workspace (it comes with a black border for you to see it. double click the border to remove it).

__Add a menu:__

Clicking __Add a menu__  will prompt you to choose the size of the menu then you will be promted to enter the enpoint for each link in the new menu.
You can save the menu for later use on other pages for example. 
To use a saved menu click the __Add a menu__ button, at the prompt you will see your previous menu(s) as `menuX` clicking a `menuX` will add it to the workspace.

__Add an image:__

Clicking __Add an image__ will open the file system browser for you to select one or more images.

__Add a video:__

Clicking __Add a video__ will open the file system browser for you to select one or more videos.

##### Editing an existing page

The pages you have created are located in this section, clicking one `page.html` will load the page content in the workspace en will add a __Save & close__ button after the __Delete page__ button.

Each page comes with a __delete page__ button that allows you to delete the page.

If you want to duplicate a page you can "right click" on the page's name. you will be asked to name the new page. click __duplicate__ to save your duplicata.

##### Custom Javascript and CSS

bellow the workspace you have three buttons one for editing CSS, one for editing Javascript and one for editing HTML.
each button works as follow:
* click the button to open the code editor. (N.B. clicking the 'edit your HTML' will get the content from the viewport)
* double click the same button to close the editor.

__Quickly add CSS:__

Right-clicking a container allows you to quickly add some essential css to that container. You can also duplicate a container and its content by click the __duplicate__ option at the bottom of the context menu.

__inlining CSS__
after editing you CSS press 'Alt+Enter' to inline it into the HTML elements.

##### Generating Javascript Snippets step by step

__Activating a container component:__
To activate a container component click it in the viewport. Some options will appear on the right.
Click the __make container__ button, it will make the container a "repeater" element.
You also can add the data attribute 'data-will-repeat="true"' manually.

__Adding one or more repeatable element(s):__
With a repeater container selected, add or drag&drop an other container inside of it and select it with a click and click the __is repeatable__ button.
You also can add the data attribute 'data-is-repeatable="true"' manually.

__Using the smart templates system:__
If you encase a ::string:: in the content of your "repetable" element it will be treated as a function parametre during the creation of the code snippet.

__Generate the Javasvript snippet:__
With a repeater container selected click on the __generate snippet__ button
Then open the built-in Javascript editor to see your new functions.

##### Generating CSS Snippets in 1 step

To add your CSS in an easy way you can right-click on the element you focus and select one css attributes. open the built-in CSS editor to edit your CSS.
(N.B. you can select many attributes for one element and they will be added into the associated CSS rule.)

__use custom fonts__
to use custom fonts, import it via CDN.
use an '@import' statement at the top of your CSS file.


##### CRM part
__Data manager:__

Allows you to create data models (mongoose Schema) for mongodb.
The model name is the "dbName" key.
The model fields are represented as a JSON object named "identifiers".  

__CRUD API manager:__

The CRUD API manager allows you to create custom routes to gather or record your data.
{"authenticated":false,"name":"deleteuser","model":"xavdb","route":"deleteuser","action":"delete"}
Use the different verbs to create a custom route. 
A route is a JSON object with at least the following 5 keys: "authenticated", "name", "model", "route" and "action"
see the templates below for more informations.
Create:
```
{
  "authenticated": false, // if set to true only authenticated user will be able to access the route
  "name": "exampleName",
  "model": "exampleModeldb", // the model that will be queried
  "route":"exampleRoute", // the path used to query the data
  "action":"create" // "create" is expecting a post request with the data model you want to create.
}
```

Read:
```
{
  "authenticated": false,
  "name": "exampleName",
  "model": "exampleModeldb",
  "route":"exampleRoute",
  "action":"read", // "read" is expecting a get. it returns a JSON array.
  "targetValues": ["exampleNameKey"] // each value represent an attibute in the specified model.
```

Update:
```
{
  "authenticated": false,
  "name": "exampleName",
  "model": "exampleModeldb",
  "route":"exampleRoute",
  "action":"update", // "update" is expecting a post request with data model you want to update.
  "targetValue": "exampleNameKey" // the value represent an attibute in the specified model we want to look for.
}
```

Delete:
```
{
  "authenticated": false,
  "name": "exampleName",
  "model": "exampleModeldb",
  "route":"exampleRoute",
  "action":"delete" // "delete" is expecting a post request with an unique identifier from the model you want to delete.
}
```

__Email configuration:__

The email configuration form allows you to connect your email provider to the CMS.
Provide the Host, Username and Password to enable emailing in your apps.

__Writing emails:__

Clicking __Send emails__ opens the WYSIWYG editor in the workspace.

* ###### Editors options
  * ![Creating a link](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btnlien.PNG)
  Select the text of the element you want to use as link and click on the ‘link’ button. In the floating text bar, enter the address to link to
  Click save to apply.
  * ![Setting background color](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btN.B.ackground.PNG)
  Select the text of the element for wich you want to change the background color and click on the ‘grayed-A’ button. 
  Click on a color to apply.
  * ![Setting text color](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btntextcolor.PNG)
  Select the text of the element for wich you want to change the font color and click on the ‘underlined-A’ button. 
  Click on a color to apply.
  * ![Changing fonts](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btnfont.PNG)
  Open the fonts menu and select a font.
  Or
  Select the text of the element for wich you want to change the font and open the fonts menu.
  Select a font to apply.
  * ![Change font size](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btnheading.PNG)
  Open the heading menu and select a font size.
  Or
  Select the text of the element for wich you want to change the font size and open the heading menu.
  Select a font size to apply.
  * ![Creating a list](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btnlist.PNG)
  To create a list choose from the ‘ordered-list’ button and the ‘unordered-list’ button press enter to create a new element.
  Click on the button again to stop the list

  * ![Aligning the text](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btnalign.PNG)
  To align your text right or left you can click the ‘align’ button and select the way the text will be displayed

  * ![Remove all formating](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btnremovestyle.PNG)
  To remove all formating click on the ‘paragraph’ button

__Add an admin:__

Allows you to create more admins (N.B.. only admins can update the content of the apps).

__Change an admins password:__

Fill the form with an existing admin username and set the new password.
Then click the 'Update password' button to save your changes.

__Export database:__

Clicking the 'Export database' button will generate a zip file from your database and download it to your computer. (N.B. admins are not part of the export as it is a potential security flaw)

__Import database:__

Clicking the 'Import database' button will allow you to pick an "xcmsExport.zip" from your computer that will be uploaded to your database so you can deploy as if you didn't migrate.

__Export medias:__

Clicking the 'Export medias' button will generate a zip file containing all your images and videos.

__Import medias:__

Clicking the 'Import medias' button will allow you to pick an "xcmsMediaExport.zip" file that will be uploaded to your server. You can then access all your assets as if you didn't migrate.