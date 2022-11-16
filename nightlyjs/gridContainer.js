export const gridContainer = (context = document.body, columns)=>{
  let div = document.createElement('div')
      div.classList.add('is-grid')
      div.style.gridTemplateColumns = "1fr ".repeat(parseInt(columns))
      context.appendChild(div)
      return div
}