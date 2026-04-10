import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMealConfig } from '../../services/api';
import './MealConfigForm.css';

const MealConfigForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedDate, setSelectedDate] = useState('');
  
  const [meals, setMeals] = useState({
    breakfast: [],
    lunch: [],
    dinner: []
  });

  const [currentItem, setCurrentItem] = useState({
    mealType: 'breakfast',
    name: '',
    hasQuantity: false,
    maxQuantity: ''
  });

  const addItem = () => {
    if (!currentItem.name.trim()) {
      setMessage({ type: 'error', text: 'Please enter item name' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }

    const newItem = {
      name: currentItem.name,
      hasQuantity: currentItem.hasQuantity,
      maxQuantity: currentItem.hasQuantity ? parseInt(currentItem.maxQuantity) : null
    };

    setMeals({
      ...meals,
      [currentItem.mealType]: [...meals[currentItem.mealType], newItem]
    });

    // Reset current item
    setCurrentItem({
      mealType: currentItem.mealType,
      name: '',
      hasQuantity: false,
      maxQuantity: ''
    });
  };

  const removeItem = (mealType, index) => {
    const updatedItems = meals[mealType].filter((_, i) => i !== index);
    setMeals({
      ...meals,
      [mealType]: updatedItems
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDate) {
      setMessage({ type: 'error', text: 'Please select a date' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }

    if (meals.breakfast.length === 0 && meals.lunch.length === 0 && meals.dinner.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one item to any meal' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }

    setLoading(true);
    try {
      await createMealConfig({
        date: selectedDate,
        meals: meals
      });
      setMessage({ type: 'success', text: 'Meal configuration saved successfully!' });
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save configuration' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getItemCount = (mealType) => {
    return meals[mealType].length;
  };

  return (
    <div className="meal-config-container">
      <div className="config-header">
        <h1>Meal Configuration</h1>
        <p>Set up menu items for breakfast, lunch, and dinner</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="config-form">
        {/* Date Selection */}
        <div className="form-card">
          <h2>Select Date</h2>
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <small>Select the date for which you want to set the menu</small>
          </div>
        </div>

        {/* Meal Type Tabs */}
        <div className="meal-tabs">
          {['breakfast', 'lunch', 'dinner'].map((meal) => (
            <button
              key={meal}
              type="button"
              className={`tab-btn ${currentItem.mealType === meal ? 'active' : ''}`}
              onClick={() => setCurrentItem({ ...currentItem, mealType: meal })}
            >
              {meal === 'breakfast' && '🥐 Breakfast'}
              {meal === 'lunch' && '🍛 Lunch'}
              {meal === 'dinner' && '🍽️ Dinner'}
              <span className="item-count">{getItemCount(meal)} items</span>
            </button>
          ))}
        </div>

        {/* Add Item Form */}
        <div className="form-card">
          <h2>Add Item to {currentItem.mealType === 'breakfast' ? '🥐 Breakfast' : currentItem.mealType === 'lunch' ? '🍛 Lunch' : '🍽️ Dinner'}</h2>
          
          <div className="form-group">
            <label>Item Name *</label>
            <input
              type="text"
              placeholder="e.g., Rice, Dal, Chapati, Coffee"
              value={currentItem.name}
              onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={currentItem.hasQuantity}
                onChange={(e) => setCurrentItem({ ...currentItem, hasQuantity: e.target.checked })}
              />
              Enable quantity tracking (e.g., number of chapati, cups of coffee)
            </label>
          </div>

          {currentItem.hasQuantity && (
            <div className="form-group">
              <label>Maximum Quantity per Person</label>
              <input
                type="number"
                placeholder="e.g., 4"
                value={currentItem.maxQuantity}
                onChange={(e) => setCurrentItem({ ...currentItem, maxQuantity: e.target.value })}
                min="1"
              />
              <small>Maximum amount a student can order</small>
            </div>
          )}

          <button type="button" className="btn-add" onClick={addItem}>
            + Add Item
          </button>
        </div>

        {/* Items List for Current Meal */}
        <div className="form-card">
          <h2>Current {currentItem.mealType === 'breakfast' ? '🥐 Breakfast' : currentItem.mealType === 'lunch' ? '🍛 Lunch' : '🍽️ Dinner'} Items</h2>
          
          {meals[currentItem.mealType].length === 0 ? (
            <p className="no-items">No items added yet. Add some items above.</p>
          ) : (
            <div className="items-list">
              {meals[currentItem.mealType].map((item, index) => (
                <div key={index} className="item-card">
                  <div className="item-info">
                    <strong>{item.name}</strong>
                    {item.hasQuantity ? (
                      <span className="badge">Max: {item.maxQuantity} per person</span>
                    ) : (
                      <span className="badge simple">Simple (No quantity)</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeItem(currentItem.mealType, index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Meals Summary */}
        <div className="form-card">
          <h2>Complete Menu Summary</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <h3>🥐 Breakfast</h3>
              {meals.breakfast.length === 0 ? (
                <p>No items</p>
              ) : (
                <ul>
                  {meals.breakfast.map((item, i) => (
                    <li key={i}>
                      {item.name}
                      {item.hasQuantity && ` (Max: ${item.maxQuantity})`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="summary-card">
              <h3>🍛 Lunch</h3>
              {meals.lunch.length === 0 ? (
                <p>No items</p>
              ) : (
                <ul>
                  {meals.lunch.map((item, i) => (
                    <li key={i}>
                      {item.name}
                      {item.hasQuantity && ` (Max: ${item.maxQuantity})`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="summary-card">
              <h3>🍽️ Dinner</h3>
              {meals.dinner.length === 0 ? (
                <p>No items</p>
              ) : (
                <ul>
                  {meals.dinner.map((item, i) => (
                    <li key={i}>
                      {item.name}
                      {item.hasQuantity && ` (Max: ${item.maxQuantity})`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/admin')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MealConfigForm;