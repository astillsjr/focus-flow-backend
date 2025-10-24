---
timestamp: 'Wed Oct 22 2025 18:52:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251022_185230.a4786d27.md]]'
content_id: 5900142fe0704e6e1fdfaaf76d288ed5396bf11fde02dfe3604a359bdeaa69ed
---

# response:

````markdown
# API Specification: Labeling Concept

**Purpose:** associate some text with another artifact (usually itself textual) that remarks on, augments or explains it

---

## API Endpoints

### POST /api/Labeling/createLabel

**Description:** Creates a new label with the given name.

**Requirements:**
- No Label with the given `name` already exists.

**Effects:**
- Creates a new Label `l`.
- Sets the name of `l` to `name`.
- Returns `l` as `label`.

**Request Body:**
```json
{
  "name": "string"
}
````

**Success Response Body (Action):**

```json
{
  "label": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/addLabel

**Description:** Associates a label with an item.

**Requirements:**

* The provided `item` must exist.
* The provided `label` must exist.
* The `item` must not already have the `label` associated with it.

**Effects:**

* Adds the `label` to the set of labels associated with the `item`.

**Request Body:**

```json
{
  "item": "string",
  "label": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/deleteLabel

**Description:** Removes an association between an item and a label.

**Requirements:**

* The provided `item` must exist.
* The provided `label` must exist.
* The `item` must have the `label` associated with it.

**Effects:**

* Removes the `label` from the set of labels associated with the `item`.

**Request Body:**

```json
{
  "item": "string",
  "label": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/\_getItemsWithLabel

**Description:** Retrieves all items associated with a given label.

**Requirements:**

* The provided `label` must exist.

**Effects:**

* Returns a set of all items that have the `label` associated with them.

**Request Body:**

```json
{
  "label": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "item": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/\_getLabelsForItem

**Description:** Retrieves all labels associated with a given item.

**Requirements:**

* The provided `item` must exist.

**Effects:**

* Returns a set of all labels associated with the `item`.

**Request Body:**

```json
{
  "item": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "label": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/\_getAllLabels

**Description:** Retrieves all existing labels.

**Requirements:**

* None.

**Effects:**

* Returns a set of all existing labels.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "label": "string",
    "name": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

```
```
