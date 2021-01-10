import './css/title.css'
export const title = (context, text, size = 1)=>{
  let title = document.createElement('h'+size)
  title.innerText = text
  context.appendChild(title)
  return title
}