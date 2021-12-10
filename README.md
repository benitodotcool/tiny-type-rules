# tiny type rules

Tiny rules is an open source project designed to correct and enforce all micro-typographic rules related to the selected language.
<!-- 
## Rules
### [FR] — French

1. `,` &#8594; `Before: nothing` `After: classic space`
2. `.` &#8594; `Before: nothing` `After: classic space`
3. `…` &#8594; `Before: nothing` `After: classic space`
4. `—` &#8594; `Before: classic space` `After: classic space`
5. `'` &#8594; `Before: nothing` `After: nothing`
6. `:` &#8594; `Before: unbreakable fine space` `After: classic space`
7. `;` &#8594; `Before: unbreakable fine space` `After: classic space`
8. `!` &#8594; `Before: unbreakable fine space` `After: classic space`
9. `?` &#8594; `Before: unbreakable fine space` `After: classic space`
10. `«`  &#8594; `Before: classic space` `After: unbreakable fine space`
11. `»` &#8594; `Before: unbreakable fine space` `After: classic space`
12. `(` &#8594; `Before: classic space` `After: nothing`
13. `)` &#8594; `Before: nothing` `After: classic space`
14. `[` &#8594; `Before: classic space` `After: nothing`
15. `]` &#8594; `Before: nothing` `After: classic space` -->

### Concept by
[@benitodotcool](https://www.instagram.com/benitodotcool/) | [benito.cool](https://benito.cool/)

----

1. Englober dans une balise globale toute l'application et passer en props la langue:
    ``` html
    <div class="wrapper__application" data-language-FR>
      …
    </div>
    ```
2. Pouvoir décider de ne pas appliquer la/les règles sur certaines balises:
    ``` html
    <div class="container__quote" data-language-null>
      …
    </div>
    ```
3. Exemple d'arborencense du dossier:
    ```
    tiny-type-rules
    │   README.md
    │   LICENSE
    |
    └───language
    |   |
    │   └───french
    │   |   │   french.json
    |   |
    │   └───english
    │       │   english.json
    │   
    └───config
        │   algorithm.js
    ```
4. Exemple `french.js`:
    ``` javascript 
    {
      ",": {
        "before": 0,
        "after": 1
      },
      ".": {
        "before": 0,
        "after": 1
      },
      ":": {
        "before": 0.5,
        "after": 1
      },
      "«": {
        "before": 1,
        "after": 0.5,
      }
    }
    ```
5. Avoir un fichier par langue qui gère les erreurs de frappe (à executer en premier):
    ``` javascript 
    {
      "...": "…",
      "“": "«",
      "”": "»"
    }
    ```
6. Avoir un fichier `config/spacing.js` qui définie chaque espace lié au valeur de `french.js`:
    ``` javascript 
    {
      0: "",
      1: " ",
      0.5: "<span class="narrowNoBreakSpace">&nbsp;</span>"
    }
    ```
7. Appliquer un style `font-size` custom à tous les éléments qui ont la classe `narrowNoBreakSpace`:
    ``` javascript 
    const narrowItems = document.querySelectorAll('.narrowNoBreakSpace');
    narrowItems.map((item) => {
      const itemFontSize = item.getFontSize(); //Ligne incorrecte
      item.style.fontSize = itemFontSize / 2;
    });
    ```