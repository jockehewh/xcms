import { createForm, addTextInput, addFileInput, addSelect} from './forms.js'
export const newUserForm = (context) =>{
  const myNewUserForm = createForm(context, 'newUserFormID', 'post', '/register')
  addTextInput(myNewUserForm, 'text', 'username')
  addTextInput(myNewUserForm, 'password', 'password')
  addFileInput(myNewUserForm, 'newUserPic', 'image/*')
  addSelect(myNewUserForm, 'gender', ['male', 'female'])
  context.appendChild(myNewUserForm)
  myNewUserForm.querySelector('button').innerText = 'Register'
  return myNewUserForm
}