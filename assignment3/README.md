# Assignment Overview

**Objective:** Extend Node.js to allow ESM loaders to be used within
workers.

**Purpose:** This task challenges you to contribute to a real-world
open-source project by implementing a feature request from the Node.js
community. The task will evaluate your ability to understand and modify
complex systems, your proficiency in JavaScript and Node.js internals,
and your capability to interact with an open-source community.

## Task Requirements

1.  **Research Phase:**
      - Familiarize yourself with the Node.js architecture, particularly
        how it handles ESM and workers.
      - Understand the current limitations and why ESM loaders are not
        available within workers, as detailed in the feature request
        [ESM loaders cannot be defined via `Worker` option `execArgv` in
        v20](https://github.com/nodejs/node/issues/47747).
      - Review the Node.js contribution guidelines to ensure your
        development aligns with their standards and practices.
2.  **Development Phase:**
      - Set up a local development environment for Node.js.
      - Implement the functionality to allow ESM loaders within workers.
        This will involve modifying the Node.js core to enable and
        handle ESM loaders in the worker threads environment.
      - Ensure compatibility and non-breaking changes with existing
        Node.js features and modules.
3.  **Testing and Validation:**
      - Create comprehensive tests to cover the new functionality. This
        includes unit tests and integration tests that demonstrate the
        ESM loaders working effectively within workers.
      - Validate that your implementation does not negatively impact
        existing functionalities.
4.  **Documentation and Community Interaction:**
      - Document your changes, the approach taken, and any challenges
        faced during the implementation.
      - Prepare to interact with the Node.js community by potentially
        submitting a pull request or discussing your implementation in
        the relevant GitHub issue discussion.
      - Outline steps for setting up the development environment and how
        to test the new feature.

## Deliverables

A fork of the Node.js repository containing:

  - Your code changes in a specific branch.
  - Tests for the new functionality.
  - A `README` file with: - A detailed explanation of the new feature
    and your implementation approach.
  - Instructions for setting up the development environment and testing
    the new feature.
  - A link to the original GitHub issue and any discussions or pull
    requests you have opened.

## Evaluation Criteria

  - **Technical Implementation:** The effectiveness of the implemented
    feature in allowing ESM loaders within workers and how well it
    integrates with the existing Node.js architecture.
  - **Code Quality:** The readability, maintainability, and performance
    of the new code.
  - **Testing:** The thoroughness of the tests and their ability to
    ensure the feature works correctly and safely.
  - **Documentation and Community Interaction:** The clarity of your
    documentation and your proactive engagement with the Node.js
    community through discussions or pull requests.

## Note to Candidates

This assignment is an advanced task that involves deep interactions with
a major open-source project. It is a chance to demonstrate not only your
technical skills but also your ability to contribute meaningfully to the
community. We value thorough understanding, innovative solutions, and
clear communication. Good luck\!
