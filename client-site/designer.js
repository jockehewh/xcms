console.log('designer.js...')

window.onload = ()=>{
    var hcount = 1
    while(hcount <= 6){
        document.querySelectorAll('h'+hcount).forEach(titre =>{
            if(titre.getAttribute('lien') === 'true'){
                document.querySelectorAll('.genesis-menu li a').forEach(lien=>{
                    lien.className += " link white"
                    console.log(lien.innerText.toLowerCase(), titre.innerText.toLowerCase())
                    if(lien.innerText.toLowerCase() === titre.innerText.toLowerCase()){
                        console.log(lien.href.toLowerCase(), titre.innerText.toLowerCase())
                        titre.id = titre.innerText
                    }
                })
            }
        })
        hcount++
    }
    document.querySelector('.genesis-menu').className += " bg-black-90 fixed w-100"
    document.querySelector('.genesis-menu').nextElementSibling.style.marginTop = window.getComputedStyle(document.querySelector('.genesis-menu')).height.split('px').join('') *2 +'px'

    document.querySelectorAll('.genesis-titre').forEach(titre=>{
        titre.style.color = "unset"
        titre.classList.add('washed-red')
        if(titre.nextElementSibling.nextElementSibling !== null && !titre.nextElementSibling.nextElementSibling.classList.contains('.genesis-titre')){
            if(/(genesis-[a-z]{2,5})/.test(titre.nextElementSibling.className) && /(genesis-titre)/.test(titre.nextElementSibling.nextElementSibling.className)){
                return
            }
            let newdiv = document.createElement('div')
            let cloneA = titre.nextElementSibling.cloneNode(true)
            let cloneB = titre.nextElementSibling.nextElementSibling.cloneNode(true)
            console.log(cloneA, cloneB)
            newdiv.appendChild(cloneA)
            newdiv.appendChild(cloneB)
            
            if(!titre.parentElement.classList.contains('.genesis-div')){
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
    document.querySelectorAll('.genesis-div').forEach(div=>{
        div.className += " washed-red bg-blue"
    })
}