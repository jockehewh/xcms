export const addImage = (context, imgurl, description = "image")=>{
  let image = document.createElement('img')
  image.src = imgurl
  image.alt = description
  image.style.margin = '5px'
  context.appendChild(image)
  return image
}