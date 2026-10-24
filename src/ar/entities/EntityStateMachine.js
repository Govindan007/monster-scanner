/**
 * Reusable Entity State Machine for VEIL AR Entities.
 * Enforces discrete states and valid transitions.
 */
export const EntityState = Object.freeze({
  IDLE: 'IDLE',
  OBSERVING: 'OBSERVING',
  DISTURBED: 'DISTURBED',
  DISAPPEARING: 'DISAPPEARING',
  INACTIVE: 'INACTIVE',
});

export class EntityStateMachine {
  constructor(initialState = EntityState.IDLE, onStateChange = null) {
    this.currentState = initialState;
    this.onStateChange = onStateChange;
    this.stateTime = 0;
  }

  getCurrentState() {
    return this.currentState;
  }

  getStateTime() {
    return this.stateTime;
  }

  canTransitionTo(nextState) {
    if (this.currentState === EntityState.INACTIVE) {
      return false; // Terminal state
    }
    if (this.currentState === EntityState.DISAPPEARING && nextState !== EntityState.INACTIVE) {
      return false; // Disappearing can only transition to inactive
    }
    return this.currentState !== nextState;
  }

  transitionTo(nextState) {
    if (!this.canTransitionTo(nextState)) {
      return false;
    }

    const prevState = this.currentState;
    this.currentState = nextState;
    this.stateTime = 0;

    if (this.onStateChange) {
      this.onStateChange(nextState, prevState);
    }

    return true;
  }

  update(delta) {
    if (this.currentState !== EntityState.INACTIVE) {
      this.stateTime += delta;
    }
  }
}
