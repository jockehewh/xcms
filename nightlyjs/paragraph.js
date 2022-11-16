import './css/paragraph.css'
export const paragraph = (context, content)=>{
  const p = document.createElement('p')
  p.innerText = content
  context.appendChild(p)
  return p
}