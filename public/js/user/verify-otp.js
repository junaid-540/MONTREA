




document.addEventListener('DOMContentLoaded',()=>{
    const timerEl = document.getElementById("timer")
    let timeLeft = 60 //1 minute//


    const countdown = setInterval(()=>{
        timeLeft--
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerEl.textContent = `Remaining: ${minutes.toString().padStart(2,"0")}:${seconds.toString().padStart(2,"0")}s`


        if(timeLeft <= 0){
            clearInterval(countdown);
            timerEl.textContent = "OTP expired";
            timerEl.style.color = "#dc3545";
        }

    },1000)

    const otpInput = document.getElementById("otp");
    otpInput.focus()
    otpInput.addEventListener('input',function(){
        this.value = this.value.replace(/[^0-9]/g,"")
    });
});