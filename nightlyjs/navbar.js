export const navbar = (context, l)=>{
  let navbar = document.createElement('nav')
  l.forEach(link=>{
    let li = document.createElement('li')
    let a = document.createElement('a')
    li.appendChild(a)
    a.innerText = link
    a.href = '#'
    navbar.appendChild(li)
  })
  context.appendChild(navbar)
  return navbar
}