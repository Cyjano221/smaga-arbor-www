/* Smaga Arbor — skrypt strony
   Zasady bezpieczeństwa przyjęte w tym pliku:
   - nigdzie nie używamy innerHTML z danymi od użytkownika (tylko textContent),
   - każdy tekst wstawiany do URL przechodzi przez encodeURIComponent,
   - dane wejściowe mają twarde limity długości (ochrona przed zalewaniem),
   - formularz ma pułapkę na boty (honeypot) i blokadę wielokrotnej wysyłki.
*/
(function () {
  "use strict";

  var TELEFON = "882 495 959";
  var EMAIL = "smagaarbor@gmail.com";

  /* Maksymalne długości pól — cokolwiek dłuższego jest przycinane */
  var LIMITY = {
    imie: 80, telefon: 24, lokalizacja: 80, liczba: 10,
    wysokosc: 20, dostep: 60, termin: 10, opis: 2000
  };

  /* --- Rok w stopce --- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* --- Menu mobilne --- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* --- Formularz wyceny --- */
  var form = document.getElementById("quoteForm");
  var status = document.getElementById("formStatus");
  var wyslany = false;          // blokada podwójnej wysyłki
  var ostatniaProba = 0;        // prosty limit częstotliwości

  /* Pobierz pole i przytnij do limitu; zwraca czysty tekst */
  function pole(nazwa) {
    var el = form.elements[nazwa];
    if (!el) return "";
    var v = String(el.value == null ? "" : el.value).trim();
    var max = LIMITY[nazwa] || 200;
    return v.slice(0, max);
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      /* 1. Pułapka na boty — pole niewidoczne dla człowieka.
            Jeśli jest wypełnione, to bot. Udajemy sukces i nic nie wysyłamy. */
      var trap = form.elements["firma_www"];
      if (trap && trap.value !== "") {
        setStatus("Dziękujemy! Odezwiemy się z wyceną.", "is-ok");
        return;
      }

      /* 2. Blokada wielokrotnego klikania / floodowania */
      var teraz = Date.now();
      if (wyslany) {
        setStatus("Zgłoszenie zostało już wysłane. Jeśli to pilne — zadzwoń: " + TELEFON + ".", "is-ok");
        return;
      }
      if (teraz - ostatniaProba < 2000) return;   // max 1 próba / 2 s
      ostatniaProba = teraz;

      /* 3. Walidacja */
      var imie = pole("imie");
      var telefon = pole("telefon");

      if (imie.length < 2) {
        setStatus("Podaj proszę imię, żebyśmy wiedzieli, jak się zwracać.", "is-err");
        return;
      }
      /* Telefon: dozwolone tylko cyfry, spacje, +, -, nawiasy; min. 9 cyfr */
      if (!/^[0-9+\-()\s]{9,24}$/.test(telefon) || (telefon.match(/\d/g) || []).length < 9) {
        setStatus("Podaj proszę poprawny numer telefonu (min. 9 cyfr).", "is-err");
        return;
      }

      var action = form.getAttribute("action") || "";
      var podlaczony = action && action.indexOf("TWOJ_ID") === -1 && /^https:\/\//i.test(action);

      /* 4a. Bez backendu — otwieramy gotowego maila w programie klienta.
             Każdy fragment idzie przez encodeURIComponent. */
      if (!podlaczony) {
        var tresc =
          "Imię: " + imie +
          "\nTelefon: " + telefon +
          "\nLokalizacja: " + pole("lokalizacja") +
          "\nLiczba drzew: " + pole("liczba") +
          "\nWysokość: " + pole("wysokosc") +
          "\nDojazd: " + pole("dostep") +
          "\nTermin: " + pole("termin") +
          "\n\nOpis:\n" + pole("opis");

        window.location.href =
          "mailto:" + EMAIL +
          "?subject=" + encodeURIComponent("Zapytanie o wycenę — " + imie) +
          "&body=" + encodeURIComponent(tresc);

        setStatus("Otwieramy Twój program pocztowy — wyślij gotowego maila. Możesz też po prostu zadzwonić: " + TELEFON + ".", "is-ok");
        return;
      }

      /* 4b. Wysyłka przez usługę formularzy (gdy podłączona, wyłącznie po HTTPS) */
      setStatus("Wysyłam…", "");
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      fetch(action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (res) {
          if (res.ok) {
            wyslany = true;
            form.reset();
            setStatus("Dziękujemy! Odezwiemy się z wyceną najszybciej jak to możliwe.", "is-ok");
          } else {
            if (btn) btn.disabled = false;
            setStatus("Coś poszło nie tak. Zadzwoń proszę: " + TELEFON + ".", "is-err");
          }
        })
        .catch(function () {
          if (btn) btn.disabled = false;
          setStatus("Brak połączenia. Zadzwoń proszę: " + TELEFON + ".", "is-err");
        });
    });
  }

  /* Wyłącznie textContent — nigdy innerHTML. Odporne na wstrzyknięcie kodu. */
  function setStatus(msg, cls) {
    if (!status) return;
    status.textContent = msg;
    status.className = "form__status" + (cls ? " " + cls : "");
  }
})();
