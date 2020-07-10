console.log('designer.js...')

window.onload = ()=>{
    var hcount = 1
    while(hcount <= 6){
        document.querySelectorAll('h'+hcount).forEach(titre =>{
            if(titre.dataset.form === "true"){
                if(window.localStorage.contacted === "true"){
                    let div = document.createElement('div')
                    let h2 = document.createElement('h2')
                    h2.innerText = "thank you for your message"
                    div.appendChild(h2)
                    div.style.background = "green"
                    div.style.color = "white"
                    div.style.display = "flex"
                    div.style.justifyContent = "center"
                    div.style.alignItems = "center"
                    titre.parentElement.replaceChild(div, titre)
                    window.localStorage.clear()
                }else{
                    let form = document.createElement('form')
                    let firstName = document.createElement('input')
                    let lastName = document.createElement('input')
                    let email = document.createElement('input')
                    let message = document.createElement('textarea')
                    let submit = document.createElement('input')
                    let nameLabel = document.createElement('label')
                    let lastNameLabel = document.createElement('label')
                    let emailLabel = document.createElement('label')
                    let messageLabel = document.createElement('label')
                    let br = document.createElement('br')
                    nameLabel.for = "firstname"
                    nameLabel.innerText = "first name:"
                    firstName.name = "firstname"
                    form.appendChild(nameLabel)
                    form.appendChild(firstName)
                    form.appendChild(br)
                    form.appendChild(br.cloneNode(true))
                    lastNameLabel.for = "lastname"
                    lastNameLabel.innerText = "last name:"
                    lastName.name = "lastname"
                    form.appendChild(lastNameLabel)
                    form.appendChild(lastName)
                    form.appendChild(br.cloneNode(true))
                    form.appendChild(br.cloneNode(true))
                    emailLabel.for = "email"
                    emailLabel.type = "email"
                    emailLabel.innerText = "email:"
                    email.name = "email"
                    form.appendChild(emailLabel)
                    form.appendChild(email)
                    form.appendChild(br.cloneNode(true))
                    form.appendChild(br.cloneNode(true))
                    messageLabel.for = "message"
                    messageLabel.innerText = "your message:"
                    message.name = "message"
                    form.appendChild(messageLabel)
                    form.appendChild(message)
                    form.appendChild(br.cloneNode(true))
                    form.appendChild(br.cloneNode(true))
                    submit.type = "submit"
                    submit.value = "submit"
                    form.appendChild(submit)
                    form.action = '/contact'
                    form.method = 'post'
                    titre.parentElement.replaceChild(form, titre)
                    form.addEventListener('submit', (e)=>{
                        window.localStorage.contacted = 'true'
                    })
                }
                
            }
            if(titre.getAttribute('lien') === 'true'){
                document.querySelectorAll('.xcms-menu li a').forEach(lien=>{
                    lien.className += " link white"
                    console.log(lien.innerText.toLowerCase(), titre.innerText.toLowerCase())
                    if(lien.innerText.toLowerCase() === titre.innerText.toLowerCase()){
                        console.log(lien.href.toLowerCase(), titre.innerText.toLowerCase())
                        titre.id = titre.innerText.toLowerCase()
                    }
                })
            }
        })
        hcount++
    }
    document.querySelectorAll('.xcms-custom').forEach(titre =>{
        if(titre.classList.contains('lien')){
                document.querySelectorAll('.xcms-menu li a').forEach(lien=>{
                    lien.className += " link white"
                    if(lien.innerText.toLowerCase() === titre.dataset.lien.toLowerCase()){
                        titre.id = titre.dataset.lien.toLowerCase()
                    }
                })
            }
    })

    if(document.querySelector('.xcms-menu') !== null){
        document.querySelector('.xcms-menu').className += " bg-green w-100 pb2 pt2 tc"
        //document.querySelector('.xcms-menu').nextElementSibling.style.marginTop = window.getComputedStyle(document.querySelector('.xcms-menu')).height.split('px').join('') *2 +'px'

        document.querySelectorAll('.xcms-div').forEach(div=>{
            div.className += " washed-red bg-blue"
        })
    }
    if(document.querySelector('.xcms-img') !== null){
        let imgArray = []
        let tempArray = document.querySelectorAll('.xcms-img')
        for (let i = 0; i < tempArray.length+1; i++){
            if(i !== tempArray.length){
                if(tempArray[i].nextSibling){
                    if(tempArray[i].nextSibling.nodeName === 'IMG' ){
                        imgArray.push({file: tempArray[i].src, index: i, node:tempArray[i]})
                        continue
                    }
                }
                if(tempArray[i].previousSibling){
                    if(tempArray[i].previousSibling.nodeName === "IMG"){
                        imgArray.push({file: tempArray[i].src, index: i, node:tempArray[i]})
                        continue
                    }
                }
                
            }
        }
        if(imgArray.length >= 3){
            imgArray.forEach(data=>{
                data.node.remove()
            })
            let visibleImages = {
                center: 0,
                left: 0,
                right: 0
            }
            let divCarroussel = document.createElement('div')
            let leftBtn = document.createElement('button')
            let rightBtn = document.createElement('button')
            divCarroussel.style.display = "grid"
            divCarroussel.style.gridTemplateColumns = "1fr 2fr 4fr 2fr 1fr"
            divCarroussel.style.gridTemplateRows = "1fr"
            divCarroussel.style.alignItems = "center"
            divCarroussel.style.justifyItems = "center"
            divCarroussel.style.height = '500px'
            divCarroussel.style.maxHeight = '500px'
            let currentImage = document.createElement('img')
            currentImage.style.gridColumn = 3
            currentImage.style.gridRow = 1
            currentImage.style.maxHeight = '500px'
            let leftImage = document.createElement('img')
            leftImage.style.gridColumn = 2
            leftImage.style.gridRow = 1
            leftImage.style.maxHeight = '500px'
            let rightImage = document.createElement('img')
            rightImage.style.gridColumn = 4
            rightImage.style.gridRow = 1
            rightImage.style.maxHeight = '500px'
            currentImage.src = imgArray[0].file
            leftImage.src = imgArray[imgArray.length-1].file
            rightImage.src = imgArray[1].file
            visibleImages.left = imgArray[imgArray.length-1].index
            visibleImages.right = imgArray[1].index
            leftBtn.innerText = "previous"
            leftBtn.id = "previous"
            leftBtn.dataset.demande = "previous"
            leftBtn.style.gridColumn = 1
            leftBtn.style.gridRow = 1
            rightBtn.innerText = "next"
            rightBtn.id = "next"
            rightBtn.dataset.demande = "next"
            rightBtn.style.gridColumn = 5
            rightBtn.style.gridRow = 1
            divCarroussel.appendChild(leftBtn)
            divCarroussel.appendChild(rightBtn)
            divCarroussel.appendChild(currentImage)
            divCarroussel.appendChild(leftImage)
            divCarroussel.appendChild(rightImage)
            document.body.appendChild(divCarroussel)
            let btnArray = [rightBtn, leftBtn]
            btnArray.forEach(btn =>{
                btn.addEventListener('click', (e)=>{
                    e.stopPropagation()
                    switch(e.target.dataset.demande){
                        case "previous":
                                visibleImages.center--
                                visibleImages.right--
                                visibleImages.left--
                            if(visibleImages.center === 0 || visibleImages.center < 0){
                                if(visibleImages.center < 0 ){
                                    visibleImages.center = imgArray.length - 1
                                    visibleImages.right = 0
                                    visibleImages.left = imgArray.length - 2
                                }else{
                                    visibleImages.center = 0
                                    visibleImages.right = 1
                                    visibleImages.left = imgArray.length - 1
                                }
                                currentImage.src = imgArray[visibleImages.center].file
                                leftImage.src = imgArray[visibleImages.left].file
                                rightImage.src = imgArray[visibleImages.right].file
                            }else{
                                if(visibleImages.left < 0){
                                    visibleImages.left = imgArray.length -1
                                }
                                if(visibleImages.right < 0){
                                    visibleImages.right = imgArray.length -1
                                }
                                currentImage.src = imgArray[visibleImages.center].file
                                leftImage.src = imgArray[visibleImages.left].file
                                rightImage.src = imgArray[visibleImages.right].file
                            }
                        break;
                        case "next":
                                visibleImages.center++
                                visibleImages.right++
                                visibleImages.left++
                            if(visibleImages.center === 0 || visibleImages.center === imgArray.length){
                                visibleImages.center = 0
                                visibleImages.right = 1
                                visibleImages.left = imgArray.length-1
                                currentImage.src = imgArray[visibleImages.center].file
                                leftImage.src = imgArray[visibleImages.left].file
                                rightImage.src = imgArray[visibleImages.right].file
                            }else{
                                if(visibleImages.right > imgArray.length-1){
                                    visibleImages.right = 0
                                }
                                if(visibleImages.left === imgArray.length){
                                    visibleImages.left = 0
                                }
                                currentImage.src = imgArray[visibleImages.center].file
                                leftImage.src = imgArray[visibleImages.left].file
                                rightImage.src = imgArray[visibleImages.right].file
                            }
                        break; 
                    }
                })
            })
        }
    }
}