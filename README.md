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

1. Englober dans une balise globale toute l'application
2. Passer en props la langue
3. Pouvoir décider de ne pas appliquer la/les règles sur certaines balises
4. Avoir un dossier `language`
5. Avoir un fichier `langue.js` pour chaque langue (ex: `french.js`) dans `language`
  `exemple:`
  ``` javascript 
  {
    ",": {
      "before": 0,
      "after": 1
    }
  }
  ```