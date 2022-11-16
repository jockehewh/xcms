import './css/forms.css'
export const createForm = (context, id = 'form', method = 'post', action= '/')=>{
  let form = document.createElement('form')
  let submitBtn = document.createElement('button')
  form.id = id
  form.method = method
  form.action = action
  submitBtn.innerText = 'submit'
  form.appendChild(submitBtn)
  appendToFormOrBody(context, form)
  return form
}

export const addTextInput = (context, type, name, label = name)=>{
  let inputContainer = document.createElement('label')
  let input = document.createElement('input')
  input.setAttribute('type', type)
  input.setAttribute('name', name)
  input.setAttribute('id', name)
  inputContainer.textContent = label+' '
  inputContainer.appendChild(input)
  appendToFormOrBody(context, inputContainer)
  return input
}

export const addFileInput = (context, name, acceptedFileMIMEType, multiple = false)=>{
  let input = document.createElement('input')
  let inputLabel = document.createElement('label')
  inputLabel.setAttribute('name', name)
  inputLabel.setAttribute('for', name)
  input.setAttribute('type', 'file')
  input.setAttribute('id', name)
  input.setAttribute('name', name)
  input.setAttribute('accept', acceptedFileMIMEType)
  input.setAttribute('multiple', multiple)
  appendToFormOrBody(context, input)
  return input
}

export const addSelect = (context, name, options)=>{
  let selectContainer = document.createElement('div')
  let selectElement = document.createElement('select')
  let label = document.createElement('label')
  label.textContent = name
  selectContainer.appendChild(label)
  selectContainer.appendChild(selectElement)
  options.forEach(option=>{
    if(option !== undefined){
      let opt = document.createElement('option')
      opt.textContent = option
      opt.value = option
      selectElement.appendChild(opt)
    }
  })
  appendToFormOrBody(context, selectContainer)
  return selectElement
}

export const addCheckboxInput = (context, name, options)=>{
  let checkboxContainer = document.createElement('div')
  let selection = document.createElement('p')
  selection.innerText = name+':'
  checkboxContainer.id = name
  options.forEach(option =>{
    let inputContainer = document.createElement('label')
    let input = document.createElement('input')
    input.setAttribute('type', 'checkbox')
    input.setAttribute('id', option)
    input.value = option
    inputContainer.textContent = option+' '
    inputContainer.appendChild(input)
    checkboxContainer.appendChild(inputContainer)
  })
  appendToFormOrBody(context, checkboxContainer)
  return checkboxContainer
}

const appendToFormOrBody = (context, formElement) =>{
  if(context.nodeName === "FORM"){
    context.insertBefore(formElement, context.querySelector('button'))
  }else{
    context.appendChild(formElement)
  }
}