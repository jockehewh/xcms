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
                    nameLabel.for = "firstname"
                    nameLabel.innerText = "first name:"
                    firstName.name = "firstname"
                    form.appendChild(nameLabel)
                    form.appendChild(firstName)
                    lastNameLabel.for = "lastname"
                    lastNameLabel.innerText = "last name"
                    lastName.name = "lastname"
                    form.appendChild(lastNameLabel)
                    form.appendChild(lastName)
                    emailLabel.for = "email"
                    emailLabel.type = "email"
                    emailLabel.innerText = "email"
                    email.name = "email"
                    form.appendChild(emailLabel)
                    form.appendChild(email)
                    messageLabel.for = "message"
                    messageLabel.innerText = "your message"
                    message.name = "message"
                    form.appendChild(messageLabel)
                    form.appendChild(message)
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
        document.querySelector('.xcms-menu').className += " bg-black-90 w-100"
        //document.querySelector('.xcms-menu').nextElementSibling.style.marginTop = window.getComputedStyle(document.querySelector('.xcms-menu')).height.split('px').join('') *2 +'px'

        document.querySelectorAll('.xcms-titre').forEach(titre=>{
            titre.style.color = "unset"
            titre.classList.add('washed-red')
            if(titre.nextElementSibling.nextElementSibling !== null && !titre.nextElementSibling.nextElementSibling.classList.contains('.xcms-titre')){
                if(/(xcms-[a-z]{2,5})/.test(titre.nextElementSibling.className) && /(xcms-titre)/.test(titre.nextElementSibling.nextElementSibling.className)){
                    return
                }
                let newdiv = document.createElement('div')
                let cloneA = titre.nextElementSibling.cloneNode(true)
                let cloneB = titre.nextElementSibling.nextElementSibling.cloneNode(true)
                console.log(cloneA, cloneB)
                newdiv.appendChild(cloneA)
                newdiv.appendChild(cloneB)
                
                if(!titre.parentElement.classList.contains('.xcms-div')){
                    titre.parentElement.replaceChild(newdiv, titre.nextElementSibling.nextElementSibling)
                    titre.nextElementSibling.remove()
                }else{
                    titre.parentElement.appendChild(newdiv)
                    titre.nextElementSibling.remove()
                    titre.nextElementSibling.remove()
                }
                newdiv.style.display = "flex"
            }
        })
        document.querySelectorAll('.xcms-div').forEach(div=>{
            div.className += " washed-red bg-blue"
        })

    }
    
}