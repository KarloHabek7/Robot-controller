try:
    from backend.robot_client import robot_client
    print("Import successful")
except Exception as e:
    import traceback
    traceback.print_exc()
