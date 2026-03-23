document.addEventListener("DOMContentLoaded", () => {

  /* ================= SCROLL REVEAL ================= */
  const sections = document.querySelectorAll(".section");

  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.25,
  };

  const revealSection = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove("hidden");
        observer.unobserve(entry.target);
      }
    });
  };

  const observer = new IntersectionObserver(revealSection, observerOptions);

  sections.forEach(section => {
    observer.observe(section);
  });


  /* ================= HAMBURGER MENU ================= */
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.querySelector(".nav-links");

  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });

});
