function makeBottomheet(title, height) {
    let bottomSheet = addElement("div", document.body, "bottomSheet");
    bottomSheet.innerHTML = "<md-elevation></md-elevation>"
    let sheetContents = addElement("div", bottomSheet, "sheetContents");
    let draggableArea = addElement("div", bottomSheet, "handleHolder");
    var btTitle;
    if (title !== "") {
        btTitle = addElement("div", draggableArea, "bottomSheetTitle");
        btTitle.innerHTML = '<p style="margin:0;">' + title + "</p>";
        addElement("md-elevation", btTitle);
        btTitle.style.margin = "-" + (btTitle.offsetHeight + 34) + "px";
    }
    let handle = addElement("div", draggableArea, "bottomSheetHandle");
    let scrim = addElement("div", document.body, "bottomSheetScrim");
    if(height){
        scrim.style.display = "none"
        scrim.style.visibillity = "hidden"
    }
    if(title == null){
        btTitle.style.display = "none"
        btTitle.style.visibillity = "hidden"
    }

    setTimeout(() => {
        scrim.style.opacity = ".32";
    }, 10);
    scrim.addEventListener("click", function () {
        sheetHeight = 0;
        onDragEnd();
    });
    let toolbarColor = document
        .querySelector('meta[name="theme-color"]')
        .getAttribute("content");
    let sheetHeight;
    
    const setSheetHeight = (value) => {
        sheetHeight = Math.max(0, Math.min(100, value));

        sheetContents.style.height = `${sheetHeight}dvh`;

        if (sheetHeight === 100) {
            bottomSheet.classList.add("fullscreenSheet");
            document
                .querySelector('meta[name="theme-color"]')
                .setAttribute(
                    "content",
                    getComputedStyle(document.body).getPropertyValue(
                        "--md-sys-color-surface-container"
                    )
                );
        } else {
            bottomSheet.classList.remove("fullscreenSheet");
            document
                .querySelector('meta[name="theme-color"]')
                .setAttribute("content", toolbarColor);
        }
    };
    

    const touchPosition = (event) => (event.touches ? event.touches[0] : event);

    let dragPosition;

    const onDragStart = (event) => {
        dragPosition = touchPosition(event).pageY;
        sheetContents.classList.add("not-selectable");
        vh = Math.max(
            document.documentElement.clientHeight || 0,
            window.innerHeight || 0
        );
    };
    var vh = Math.max(
        document.documentElement.clientHeight || 0,
        window.innerHeight || 0
    );
    var mouseDown = 0;
    window.onmousedown = function () {
        ++mouseDown;
    };
    window.onmouseup = function () {
        --mouseDown;
    };

    const onDragMove = (event) => {
        if ((mouseDown || event.type == "touchmove" ) && event.target.closest('.bottomSheet')) {
            const y = touchPosition(event).pageY;
            var deltaY = dragPosition - y;

            if (
                mainContent.innerHTML.includes("md-list") &&
                sheetContents.scrollHeight > sheetContents.clientHeight && deltaY>0
            ){
               if(sheetHeight<100)sheetContents.style.overflow = "hidden"; else sheetContents.style.overflow = "scroll"
            }
            if (
                mainContent.innerHTML.includes("md-list") &&
                sheetContents.scrollHeight > sheetContents.clientHeight && deltaY<0
            ){
               if(sheetContents.scrollTop>1) deltaY = 0
            }
          
            
          if(sheetHeight==100 && deltaY<0 && !event.target.closest('.handleHolder')) return
         
            const mainContentHeight = Math.min(
                mainContent.clientHeight,
                mainContent.scrollHeight
            );
            sheetHeight3 = (mainContentHeight / vh) * 100;

            if (
                
                mainContent.innerHTML.includes("md-list") && sheetHeight < 30 &&deltaY<0
            ) {
               deltaY = 0;
            } 
            const deltaHeight = (deltaY / window.innerHeight) * 100;

            setSheetHeight(sheetHeight + deltaHeight);
                
           
           
            dragPosition = y;
        }
    };
    const onDragEnd = () => {
        setTimeout(() => {
            dragPosition = undefined;
            sheetContents.classList.remove("not-selectable");

            var sheetHeight3;

            const mainContentHeight = Math.min(
                mainContent.clientHeight,
                mainContent.scrollHeight
            );
            sheetHeight3 = (mainContentHeight / vh) * 100;

            if (mainContent.innerHTML.includes("md-list")) {
                if (sheetHeight > 65) {
                    setSheetHeight(100);
                } else {
                    setSheetHeight(30);
                } 
            }  else if (sheetHeight > sheetHeight3 + (100 - sheetHeight3) / 2) {
                setSheetHeight(100);
            } 

           
        }, 6);
    };
    const setIsSheetShown = (isShown) => {
        bottomSheet.setAttribute("aria-hidden", String(!isShown));
        scrim.style.opacity = "0";
        if (title !== "") {
            btTitle.style.transform = "scale(1,0)";
        }

        bottomSheet.addEventListener(
            "transitionend",
            function (event) {
                bottomSheet.remove();
                scrim.remove();
            },
            false
        );
    };

    window.addEventListener("mousedown", onDragStart);
    window.addEventListener("touchstart", onDragStart);

    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("touchmove", onDragMove);

    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchend", onDragEnd);

    let mainContent = addElement("main", sheetContents, "mainSheet");
    if(height)setSheetHeight(height); else{
        setSheetHeight(
            Math.min(sheetContents.offsetHeight, 50, (720 / window.innerHeight) * 100)
        ); 
    }

    
setTimeout(() => {
    const observer = new MutationObserver((mutations) =>
    mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
            setTimeout(() => {
                const mainContentHeight = Math.min(
                    mainContent.clientHeight,
                    mainContent.scrollHeight
                ); // Adding 60px for padding or margin

                // Calculate the percentage height of mainContent relative to the viewport height
                const sheetHeight2 = (mainContentHeight / vh) * 100;

                // Set the height of .mainSheet using the calculated percentage height
                if (mainContent.innerHTML.includes("arrivalsScroll")&& !mainContent.innerHTML.includes('ajokyxw')) {
                  
                    console.log("kkek")
                      setSheetHeight(100);
                } else {
                    console.log("kkk")
                    if(mainContent.innerHTML.includes('ajokyxw')){
                        setSheetHeight(30);
                    }else{
                        
                    }
      
                }

            }, 10);
            
        }
    })
);

observer.observe(mainContent, { childList: true });
}, 1000);


    return mainContent;
}