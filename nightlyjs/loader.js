import './css/loader.css'
export const showLoader = (lang)=>{
  let div = document.createElement('div')
  div.classList.add('loader')
  document.body.appendChild(div)
  return div
}