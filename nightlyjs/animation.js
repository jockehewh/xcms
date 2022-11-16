export const animationShell = ()=>{
  let outerDiv = document.createElement('div')
  outerDiv.style.display = 'grid'
  outerDiv.style.gridTemplateColumns = "1fr ".repeat(16)
  outerDiv.style.gridTemplateRows = "1fr ".repeat(8)
  outerDiv.style.minHeight = '300px'
  outerDiv.style.gridGap = '10px'
  return outerDiv
}