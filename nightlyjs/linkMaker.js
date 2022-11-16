export const linkElements = (link, target, label) =>{
  let message = ""
  if(link.id === "" && target.id === ""){
    link.id = label
    target.id = label
    isID = true
    message = `the id for ${link.nodeName} and ${target.nodeName} nodes is set to "${label}"`
    return {isID, message}
  }else{
    link.dataset.linked = label
    target.dataset.linked = label
    isData = true
    message = `the data attribute for ${link.nodeName} and ${target.nodeName} nodes is set to "${label}"`
    return {isData, message}
  }
}

export const navigationLink = (context, linktext, destination) =>{
  let a = document.createElement('a')
  a.innerText = linktext
  a.href = destination
  context.appendChild(a)
  return a
}