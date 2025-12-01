-- Drop the old check constraint on plus_one_meal_choice that doesn't include 'kids'
ALTER TABLE rsvps DROP CONSTRAINT IF EXISTS rsvps_plus_one_meal_choice_check;

-- Add updated constraint that includes 'kids' option
ALTER TABLE rsvps ADD CONSTRAINT rsvps_plus_one_meal_choice_check
  CHECK (plus_one_meal_choice IS NULL OR plus_one_meal_choice IN ('chicken', 'beef', 'fish', 'vegetarian', 'vegan', 'kids'));

-- Also update the main meal_choice constraint if it exists
ALTER TABLE rsvps DROP CONSTRAINT IF EXISTS rsvps_meal_choice_check;
ALTER TABLE rsvps ADD CONSTRAINT rsvps_meal_choice_check
  CHECK (meal_choice IS NULL OR meal_choice IN ('chicken', 'beef', 'fish', 'vegetarian', 'vegan', 'kids'));
