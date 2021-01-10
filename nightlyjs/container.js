export const container = (context, width = 'auto', height = 'auto') =>{
  let div = document.createElement('div')
  div.style.width = width
  div.style.height = height
  context.appendChild(div)
  return div
}