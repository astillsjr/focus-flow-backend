[@concept-design-overview](../background/concept-design-overview.md)

# question: how do concepts compare to OOP?
# response:

Concept Design represents a shift in how software functionality is structured and composed, offering a distinct approach compared to Object-Oriented Programming (OOP). While both aim for modularity, reusability, and maintainability, their fundamental units of abstraction, interaction patterns, and focus differ significantly.

Here's a comparison:

1.  **Unit of Modularity and Focus:**
    *   **Concepts:** The primary unit is a **reusable piece of user-facing functionality** that serves a well-defined and intelligible purpose (e.g., *Upvote*, *RestaurantReservation*, *Comment*). Concepts often span multiple "object" types and represent a complete, atomic *behavioral protocol* or *value-delivering function*. Their focus is on the "what" and "why" from a user's perspective.
    *   **OOP:** The primary unit is a **class/object**, which typically models a real-world or abstract *entity* (a "noun") along with its associated data (state/attributes) and behavior (methods). The focus is often on encapsulating data and the operations that can be performed *on that data*.

2.  **State and Encapsulation:**
    *   **Concepts:** A concept maintains its **own state**, which is "sufficiently rich to support the concept's behavior" and typically involves **objects of several different kinds** and relationships between them (e.g., *Upvote* tracking items, users, and their vote relationships). The state is narrowly focused on what's needed for *its specific purpose*.
    *   **OOP:** An object encapsulates its **internal state (attributes)** and exposes methods to interact with that state. While an object can hold references to other objects, its primary state is usually about *itself*.

3.  **Interaction and Composition:**
    *   **Concepts:** Concepts are **mutually independent** and cannot directly refer to or use each other's services. They communicate and compose functionality exclusively through **synchronizations (syncs)**. A sync is a declarative rule that describes "when an action happens in concept A, where concept B has a certain property, then some action happens in concept C." This is a fundamental departure from direct method calls or traditional dependency injection.
    *   **OOP:** Objects interact primarily through **method calls**. Composition is achieved by one object holding a reference to another object and invoking its methods, or through inheritance where a subclass reuses/extends behavior from a superclass. Objects are inherently coupled through these direct interactions.

4.  **Separation of Concerns:**
    *   **Concepts:** Aim for a **more effective separation of concerns** by disentangling functionality that is often conflated in traditional designs. For example, a "User" in OOP might handle authentication, profiles, and notifications. In concept design, these would be separate concepts (*UserAuthentication*, *Profile*, *Notification*), each addressing a single, coherent aspect of user-related functionality.
    *   **OOP:** While aiming for separation via encapsulation, it's common for concerns to be conflated around entities (e.g., a `User` class becoming a "God object" handling many disparate user-related functions).

5.  **Completeness of Functionality:**
    *   **Concepts:** Are designed to be **complete** with respect to their functionality. A concept doesn't "make a call" to another concept to finish its work; its core actions are fully self-contained. Any cross-concept dependency is handled by syncs.
    *   **OOP:** Objects often rely on **collaborator objects** to complete complex tasks, meaning a single method call might cascade through many other objects to achieve its full effect.

6.  **Reusability:**
    *   **Concepts:** Designed for **high reusability** across applications and multiple instantiations within an application. Their independence and archetypal nature make them "repositories of design knowledge and experience," enabling consistent user experiences and reducing design/development effort.
    *   **OOP:** Classes are reusable, but their reusability can be hampered by tight coupling (e.g., an object needing specific collaborator types or inheriting from a complex hierarchy), making it harder to pluck out and reuse a single class in a different context without bringing along its dependencies.

7.  **Polymorphism:**
    *   **Concepts:** Utilize polymorphism to ensure **independence**. A concept is designed to be free of assumptions about the specific content and interpretation of objects passed as action arguments, making it applicable to arbitrary targets (e.g., `Comment` applying to any target, not just `Post`).
    *   **OOP:** Polymorphism is a core principle, allowing objects of different classes to be treated as objects of a common type, or to respond to the same method call in different ways (e.g., an `Animal` base class with `Dog` and `Cat` subclasses overriding a `makeSound()` method). The application of polymorphism is different, with concepts using it to achieve broad, context-agnostic reusability.

In essence, while OOP focuses on building systems from interacting *entities*, Concept Design focuses on building systems from interacting *functional concerns* or *user-facing behaviors*. The "mutual independence" and "composition by synchronization" are the most radical departures from traditional OOP models, aiming to achieve a deeper level of modularity and reduced coupling.