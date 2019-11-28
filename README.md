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
     }
}
```

open your browser and visit the following address `localhost:$PORT` you will be redirected to the connexion page:

the default user is `superuser` and the password is `2one0time1password9`

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

__Open editor:__

Clicking __Open editor__ opens the WYSIWYG editor in the workspace.

* ###### Editors options
  * ![Adding a class](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btncls.PNG) 
  With the editor open, select the text of the element you want to name and click on the ‘.cls’ button. In the floating text bar, enter the class name for your element(s).
  Click save to apply.
  * ![Adding an ID](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btnid.PNG)
  With the editor open, select the text of the element you want to add and ID to and click on the ‘reverse-link’ button. In the floating text bar, enter the ID for your element(s) .
  Click save to apply.
  * ![Creating a link](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btnlien.PNG)
  Select the text of the element you want to use as link and click on the ‘link’ button. In the floating text bar, enter the address to link to
  Click save to apply.
  * ![Setting background color](https://github.com/jockehewh/xcms/blob/master/readme-imgs/btnbackground.PNG)
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

__closing the editor:__
To close the editor click `save` in the editor
Clicking save will add the “xcms-custom” class to the current element.

__Add a container:__

Clicking __Add a container__ will add a container to the workspace (it comes with a black border for you to see it. double click the border to remove it).

__Add a menu:__

Clicking __Add a menu__  will prompt you to choose the size of the menu then you will be promted to enter the enpoint for each link in the new menu. (the menu will appear unstyled. it is styled on the client side only, this is where you want to change your CSS).
you can save the menu for later use on other pages for example. (note: the menu are saved locally and will disapear if you empty the cache of the application.)
to use a saved menu click the __Add a menu__ button, at the prompt you will see your previous menu(s) as `menuX` clicking a `menuX` will add it to the workspace.

__Add an image:__

Clicking __Add an image__ will open the file system browser for you to select one or more images.

__Add a video:__

Clicking __Add a video__ will open the file system browser for you to select one or more videos.

##### Editing an existing page

The pages you have created are located in this section, clicking one `page.html` will load the page content in the workspace en will add a __Save & close__ button after the __Delete page__ button.

Each page comes with a __delete page__ button that allows you to delete the page.

##### Custom Javascript and CSS

bellow the workspace you have two buttons one for editing CSS and one for editing Javascript.
each button works as follow:
* click the button to open the code editor
* double click the same button to close the editor.