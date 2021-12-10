# tiny type rules

Tiny rules is an open source project designed to correct and enforce all micro-typographic rules related to the selected language.

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
15. `]` &#8594; `Before: nothing` `After: classic space`

### Concept by
[@benitodotcool](https://www.instagram.com/benitodotcool/) | [benito.cool](https://benito.cool/)

----

1. Englober dans une balise globale toute l'application et passer en props la langue.

    ``` html
    <div class="wrapper__application" data-language-FR>
      …
    </div>
    ```
2. Pouvoir décider de ne pas appliquer la/les règles sur certaines balises.
3. Avoir un dossier `language`.
4. Avoir un fichier `langue.js` pour chaque langue (ex: `french.js`) dans `language`.
5. Exemple `french.js`:

    ``` javascript 
    {
      ",": {
        "before": 0,
        "after": 1
      }
      ".": {
        "before": 0,
        "after": 1
      }
      ":": {
        "before": 0.5,
        "after": 1
      }
    }
    ```
6. Avoir un fichier par langue qui gère les erreurs de frappe (ex: `...` &#8594; `…`).