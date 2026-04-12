export interface ContainerOptions {
  containerId?: string;
  defaultId: string;
  allowToChangeParentStyles?: boolean;
}

export function getContainerElement(options: ContainerOptions): HTMLElement {
  const { containerId, defaultId } = options;
  const id = containerId || defaultId;
  let container = document.getElementById(id);

  if (!container) {
    container = document.createElement('div');
    container.id = id;
    document.body.appendChild(container);
  }
  return container;
}

export interface ShadowRootResult {
  rootNode: ShadowRoot | Document;
  mountPoint: HTMLElement;
}

export function createShadowRootIfNeeded(
  container: HTMLElement,
  allowToChangeParentStyles?: boolean
): ShadowRootResult {
  if (allowToChangeParentStyles === false) {
    // Use shadow DOM
    let shadowRoot = container.shadowRoot;
    if (!shadowRoot) {
      shadowRoot = container.attachShadow({ mode: 'open' });
    }

    const mountPoint = document.createElement('div');
    shadowRoot.appendChild(mountPoint);

    return {
      rootNode: shadowRoot,
      mountPoint
    };
  } else {
    // No shadow DOM, mount directly
    return {
      rootNode: document,
      mountPoint: container
    };
  }
}

