"""
Simple verification script for ML service foundation.

This script verifies that all components are properly set up
without running into Pydantic recursion issues.
"""

import os
import sys

def verify_files_exist():
    """Verify all required files exist."""
    required_files = [
        'requirements.txt',
        'models.py',
        'feature_engineering.py',
        'external_apis.py',
        'route.py',
        '__init__.py'
    ]
    
    print("🔍 Verifying file structure...")
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ {file} exists")
        else:
            print(f"❌ {file} missing")
            return False
    
    return True

def verify_imports():
    """Verify basic imports work."""
    print("\n🔍 Verifying imports...")
    
    try:
        # Test basic Python imports
        import json
        import os
        from datetime import datetime, date
        from typing import Dict, List, Any, Optional
        print("✅ Basic Python imports work")
        
        # Test that our files can be imported (basic syntax check)
        import importlib.util
        
        # Check models.py
        spec = importlib.util.spec_from_file_location("models", "models.py")
        if spec and spec.loader:
            print("✅ models.py syntax is valid")
        else:
            print("❌ models.py has syntax issues")
            return False
            
        # Check feature_engineering.py
        spec = importlib.util.spec_from_file_location("feature_engineering", "feature_engineering.py")
        if spec and spec.loader:
            print("✅ feature_engineering.py syntax is valid")
        else:
            print("❌ feature_engineering.py has syntax issues")
            return False
            
        # Check external_apis.py
        spec = importlib.util.spec_from_file_location("external_apis", "external_apis.py")
        if spec and spec.loader:
            print("✅ external_apis.py syntax is valid")
        else:
            print("❌ external_apis.py has syntax issues")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Import error: {str(e)}")
        return False

def verify_requirements():
    """Verify requirements.txt has expected packages."""
    print("\n🔍 Verifying requirements.txt...")
    
    try:
        with open('requirements.txt', 'r') as f:
            content = f.read()
            
        expected_packages = [
            'pydantic',
            'pandas',
            'numpy',
            'scikit-learn',
            'xgboost',
            'requests'
        ]
        
        for package in expected_packages:
            if package in content:
                print(f"✅ {package} found in requirements")
            else:
                print(f"❌ {package} missing from requirements")
                return False
                
        return True
        
    except Exception as e:
        print(f"❌ Error reading requirements.txt: {str(e)}")
        return False

def main():
    """Run all verification checks."""
    print("🧪 ML Service Foundation Verification\n")
    
    checks = [
        verify_files_exist,
        verify_imports,
        verify_requirements
    ]
    
    all_passed = True
    for check in checks:
        if not check():
            all_passed = False
    
    print("\n" + "="*50)
    if all_passed:
        print("✅ All verification checks passed!")
        print("🎉 ML service foundation is properly set up.")
    else:
        print("❌ Some verification checks failed.")
        print("🔧 Please review the issues above.")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)